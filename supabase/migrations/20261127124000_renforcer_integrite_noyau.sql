-- Invariants du noyau relationnel. Cette migration ne met pas en oeuvre les
-- fonctionnalités badge, scan ou anomalie : elle protège leurs référentiels.

create extension if not exists btree_gist;

create function public.jours_semaine_sont_uniques(jours smallint[])
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select cardinality(jours) = (
    select count(distinct jour)
    from unnest(jours) as jour
  );
$$;

alter table public.time_windows
  add constraint time_windows_weekdays_unique
  check (public.jours_semaine_sont_uniques(weekdays));

-- Deux itinéraires actifs ne doivent pas définir des attentes contradictoires
-- pour le même élève. valid_until est inclus dans le modèle métier ; la borne
-- haute du daterange est donc rendue exclusive le jour suivant.
alter table public.itineraries
  add constraint itineraries_active_dates_do_not_overlap
  exclude using gist (
    student_id with =,
    daterange(valid_from, coalesce(valid_until + 1, 'infinity'::date), '[)') with &&
  ) where (active);

create function public.verifier_lien_parent_eleve()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = new.parent_id
      and school_id = new.school_id
      and role = 'PARENT'
      and active
  ) then
    raise exception 'Le rattachement exige un profil parent actif'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger parent_students_verifier_parent
before insert or update of school_id, parent_id on public.parent_students
for each row execute function public.verifier_lien_parent_eleve();
