create type public.type_anomalie as enum ('PASSAGE_MANQUANT', 'HORS_FENETRE', 'POINT_INATTENDU', 'DOUBLE_SCAN', 'HORLOGE_INCERTAINE', 'DUPLICATION_QR');
create type public.etat_anomalie as enum ('OUVERTE', 'RESOLUE');

create table public.anomalies (
  id uuid primary key default gen_random_uuid(),
  ecole_id uuid not null,
  eleve_id uuid not null,
  passage_id uuid references public.passages (id) on delete set null,
  fenetre_id uuid references public.time_windows (id) on delete set null,
  jour date not null,
  type public.type_anomalie not null,
  etat public.etat_anomalie not null default 'OUVERTE',
  detectee_le timestamptz not null default now(),
  resolue_le timestamptz,
  unique nulls not distinct (ecole_id, eleve_id, fenetre_id, jour, type),
  foreign key (eleve_id, ecole_id) references public.students (id, school_id)
);

create function public.detecter_passages_manquants(moment_detection timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare nombre integer;
begin
  with fenetres_cloturees as (
    select itinerary.student_id as eleve_id, time_window.id as fenetre_id, itinerary.school_id as ecole_id,
      (moment_detection at time zone school.timezone)::date as jour
    from public.itineraries itinerary
    join public.time_windows time_window on time_window.itinerary_id = itinerary.id
    join public.schools school on school.id = itinerary.school_id
    where itinerary.active
      and (moment_detection at time zone school.timezone)::date between itinerary.valid_from and coalesce(itinerary.valid_until, 'infinity'::date)
      and extract(isodow from moment_detection at time zone school.timezone)::smallint = any(time_window.weekdays)
      and (moment_detection at time zone school.timezone)::time >= time_window.ends_at
  ), candidates as (
    select f.* from fenetres_cloturees f
    where not exists (select 1 from public.exceptions_calendrier e where e.ecole_id = f.ecole_id and e.jour = f.jour and (e.eleve_id is null or e.eleve_id = f.eleve_id))
      and not exists (select 1 from public.passages p join public.time_windows w on w.id = f.fenetre_id where p.eleve_id = f.eleve_id and p.point_controle_id = w.checkpoint_id and p.etat_validation = 'ACCEPTE' and (p.heure_locale at time zone 'Africa/Douala')::time between w.starts_at and w.ends_at and (p.heure_locale at time zone 'Africa/Douala')::date = f.jour)
  ), insertion as (
    insert into public.anomalies (ecole_id, eleve_id, fenetre_id, jour, type)
    select ecole_id, eleve_id, fenetre_id, jour, 'PASSAGE_MANQUANT' from candidates
    on conflict (ecole_id, eleve_id, fenetre_id, jour, type) do nothing
    returning id
  ) select count(*) into nombre from insertion;
  return nombre;
end;
$$;

alter table public.anomalies enable row level security;
revoke all on public.anomalies from anon, authenticated;
grant select on public.anomalies to authenticated;
create policy "responsables lisent les anomalies de leur établissement"
on public.anomalies for select to authenticated
using (public.current_user_has_role_in_school('MANAGER', ecole_id));
