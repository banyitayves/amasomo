create table if not exists public.learning_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint learning_bookmarks_one_target check (
    (lesson_id is not null and question_id is null)
    or (lesson_id is null and question_id is not null)
  ),
  unique (user_id, lesson_id),
  unique (user_id, question_id)
);

create table if not exists public.learning_question_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  attempt_count integer not null default 1 check (attempt_count > 0),
  last_correct boolean not null,
  last_attempted_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table if not exists public.teacher_support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_email text not null,
  student_name text not null default '',
  contact_method text not null check (contact_method in ('email', 'whatsapp', 'phone')),
  contact_phone text,
  subject_id uuid references public.subjects(id) on delete set null,
  message text not null check (char_length(message) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending', 'contacted', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_question_attempts_retry_idx
  on public.learning_question_attempts(user_id, last_correct, last_attempted_at desc);
create index if not exists teacher_support_requests_status_idx
  on public.teacher_support_requests(status, created_at desc);
create index if not exists teacher_support_requests_user_idx
  on public.teacher_support_requests(user_id, created_at desc);

create or replace function public.record_learning_question_attempt(
  p_user_id uuid,
  p_question_id uuid,
  p_correct boolean
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  insert into public.learning_question_attempts (user_id, question_id, attempt_count, last_correct, last_attempted_at)
  values (p_user_id, p_question_id, 1, p_correct, now())
  on conflict (user_id, question_id) do update
  set attempt_count = learning_question_attempts.attempt_count + 1,
      last_correct = excluded.last_correct,
      last_attempted_at = excluded.last_attempted_at;
end;
$$;

revoke all on function public.record_learning_question_attempt(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.record_learning_question_attempt(uuid, uuid, boolean) to service_role;

alter table public.learning_bookmarks enable row level security;
alter table public.learning_question_attempts enable row level security;
alter table public.teacher_support_requests enable row level security;

revoke all on public.learning_bookmarks, public.learning_question_attempts, public.teacher_support_requests from public, anon, authenticated;
grant all on public.learning_bookmarks, public.learning_question_attempts, public.teacher_support_requests to service_role;

insert into public.learning_question_attempts (
  user_id, question_id, attempt_count, last_correct, last_attempted_at
)
select distinct on (attempt.user_id, (review_item.value->>'questionId')::uuid)
  attempt.user_id,
  (review_item.value->>'questionId')::uuid,
  1,
  (review_item.value->>'correct')::boolean,
  attempt.created_at
from public.exam_attempts as attempt
cross join lateral jsonb_array_elements(attempt.review) as review_item(value)
where review_item.value ? 'questionId'
  and review_item.value ? 'correct'
order by attempt.user_id, (review_item.value->>'questionId')::uuid, attempt.created_at desc
on conflict (user_id, question_id) do nothing;
