-- Points de contrôle et parcours attendus des élèves.

create type public.checkpoint_type as enum ('ENTRY', 'EXIT', 'BUS');

create table public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  label text not null check (char_length(trim(label)) between 2 and 120),
  type public.checkpoint_type not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, label),
  unique (id, school_id)
);

create table public.itineraries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  student_id uuid not null,
  valid_from date not null,
  valid_until date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from),
  unique (id, school_id),
  foreign key (student_id, school_id)
    references public.students (id, school_id)
    on delete cascade
);

create table public.time_windows (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  itinerary_id uuid not null,
  checkpoint_id uuid not null,
  position integer not null check (position > 0),
  starts_at time not null,
  ends_at time not null,
  weekdays smallint[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  check (cardinality(weekdays) > 0),
  check (weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  unique (itinerary_id, position),
  foreign key (itinerary_id, school_id)
    references public.itineraries (id, school_id)
    on delete cascade,
  foreign key (checkpoint_id, school_id)
    references public.checkpoints (id, school_id)
    on delete restrict
);

create index checkpoints_school_id_idx on public.checkpoints (school_id);
create index itineraries_student_id_idx on public.itineraries (student_id);
create index itineraries_school_id_idx on public.itineraries (school_id);
create index time_windows_checkpoint_id_idx on public.time_windows (checkpoint_id);

create trigger checkpoints_set_updated_at
before update on public.checkpoints
for each row execute function public.set_updated_at();

create trigger itineraries_set_updated_at
before update on public.itineraries
for each row execute function public.set_updated_at();

create trigger time_windows_set_updated_at
before update on public.time_windows
for each row execute function public.set_updated_at();

alter table public.checkpoints enable row level security;
alter table public.itineraries enable row level security;
alter table public.time_windows enable row level security;
