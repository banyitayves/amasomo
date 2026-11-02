create table if not exists public.study_resources (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null,
  description jsonb not null default '{}'::jsonb,
  category text not null check (category in ('notes', 'past_papers', 'exercises', 'exams')),
  subject_id uuid references public.subjects(id) on delete set null,
  object_path text not null unique,
  file_name text not null,
  file_size bigint not null check (file_size between 1 and 52428800),
  mime_type text not null,
  published boolean not null default true,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists study_resources_published_created_idx
  on public.study_resources(published, created_at desc);
create index if not exists study_resources_subject_idx
  on public.study_resources(subject_id);

alter table public.study_resources enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'learning-resources',
  'learning-resources',
  false,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
