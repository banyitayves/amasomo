create extension if not exists pgcrypto;

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  icon text not null default 'book',
  color text not null default 'green',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title jsonb not null,
  description jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  title jsonb not null,
  summary jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  media_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  question_type text not null check (question_type in ('exercise', 'exam')),
  prompt jsonb not null,
  options jsonb not null,
  answer text not null check (answer in ('A', 'B', 'C', 'D')),
  explanation jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title jsonb not null,
  description jsonb not null default '{}'::jsonb,
  duration_minutes integer not null default 20 check (duration_minutes between 1 and 240),
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_questions (
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (exam_id, question_id)
);

create table if not exists public.lesson_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  score integer not null,
  total_questions integer not null,
  score_percent integer not null,
  review jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists topics_subject_order_idx on public.topics(subject_id, sort_order);
create index if not exists lessons_topic_order_idx on public.lessons(topic_id, sort_order);
create index if not exists questions_topic_type_idx on public.questions(topic_id, question_type);
create index if not exists attempts_user_date_idx on public.exam_attempts(user_id, created_at desc);

alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.lessons enable row level security;
alter table public.questions enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.lesson_completions enable row level security;
alter table public.exam_attempts enable row level security;

-- Only the Express API uses the service-role key. Student access is checked there
-- against the verified Supabase Auth user; answer keys never go to the browser
-- before an exercise check or a submitted exam.
