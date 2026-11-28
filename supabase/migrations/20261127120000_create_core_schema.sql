-- Noyau relationnel de Passage : établissements, comptes applicatifs et élèves.
-- Les écritures métier et les politiques d'accès détaillées arrivent dans les migrations dédiées.

create type public.user_role as enum ('MANAGER', 'AGENT', 'PARENT');

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  timezone text not null default 'Africa/Douala',
  daily_message_limit integer not null default 3 check (daily_message_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, name)
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  role public.user_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, school_id)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name),
  unique (id, school_id)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  class_id uuid not null,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, school_id),
  foreign key (class_id, school_id)
    references public.classes (id, school_id)
    on delete restrict
);

create table public.parent_students (
  school_id uuid not null,
  parent_id uuid not null,
  student_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id),
  foreign key (parent_id, school_id)
    references public.profiles (id, school_id)
    on delete cascade,
  foreign key (student_id, school_id)
    references public.students (id, school_id)
    on delete cascade
);

create index profiles_school_id_idx on public.profiles (school_id);
create index classes_school_id_idx on public.classes (school_id);
create index students_school_id_idx on public.students (school_id);
create index students_class_id_idx on public.students (class_id);
create index parent_students_student_id_idx on public.parent_students (student_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger schools_set_updated_at
before update on public.schools
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger classes_set_updated_at
before update on public.classes
for each row execute function public.set_updated_at();

create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

-- Refus par défaut : aucune table métier n'est lisible via l'API tant que les
-- politiques RLS détaillées n'ont pas été ajoutées et testées.
alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.parent_students enable row level security;
