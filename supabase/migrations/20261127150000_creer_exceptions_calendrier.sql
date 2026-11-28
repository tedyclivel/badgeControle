create type public.type_exception_calendrier as enum (
  'JOUR_FERIE',
  'ABSENCE_JUSTIFIEE',
  'SORTIE_ANTICIPEE'
);

create table public.exceptions_calendrier (
  id uuid primary key default gen_random_uuid(),
  ecole_id uuid not null references public.schools (id) on delete cascade,
  eleve_id uuid,
  jour date not null,
  type public.type_exception_calendrier not null,
  motif text check (motif is null or char_length(trim(motif)) <= 500),
  cree_le timestamptz not null default now(),
  foreign key (eleve_id, ecole_id)
    references public.students (id, school_id)
    on delete cascade,
  check ((type = 'JOUR_FERIE' and eleve_id is null) or (type <> 'JOUR_FERIE' and eleve_id is not null)),
  unique nulls not distinct (ecole_id, eleve_id, jour, type)
);

create index exceptions_calendrier_recherche_idx
  on public.exceptions_calendrier (ecole_id, jour, eleve_id);

alter table public.exceptions_calendrier enable row level security;
revoke all on public.exceptions_calendrier from anon, authenticated;
grant select on public.exceptions_calendrier to authenticated;
create policy "responsables lisent les exceptions de leur établissement"
on public.exceptions_calendrier for select to authenticated
using (public.current_user_has_role_in_school('MANAGER', ecole_id));
