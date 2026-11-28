create or replace function public.detecter_anomalies_evenement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fenetre public.time_windows%rowtype;
  heure_locale time;
  jour_local date;
begin
  select (new.heure_locale at time zone school.timezone)::time,
         (new.heure_locale at time zone school.timezone)::date
  into heure_locale, jour_local
  from public.schools school where school.id = new.ecole_id;

  select fenetre_horaire.* into fenetre
  from public.itineraries itinerary
  join public.time_windows fenetre_horaire on fenetre_horaire.itinerary_id = itinerary.id
  where itinerary.student_id = new.eleve_id
    and itinerary.active
    and jour_local between itinerary.valid_from and coalesce(itinerary.valid_until, 'infinity'::date)
    and extract(isodow from jour_local)::smallint = any(fenetre_horaire.weekdays)
    and fenetre_horaire.checkpoint_id = new.point_controle_id
  limit 1;

  if fenetre.id is null then
    insert into public.anomalies (ecole_id, eleve_id, passage_id, jour, type)
    values (new.ecole_id, new.eleve_id, new.id, jour_local, 'POINT_INATTENDU')
    on conflict do nothing;
  elsif heure_locale < fenetre.starts_at or heure_locale > fenetre.ends_at then
    insert into public.anomalies (ecole_id, eleve_id, passage_id, fenetre_id, jour, type)
    values (new.ecole_id, new.eleve_id, new.id, fenetre.id, jour_local, 'HORS_FENETRE')
    on conflict do nothing;
  end if;

  if new.resultat_synchronisation = 'CODE_DEJA_CONSOMME' then
    insert into public.anomalies (ecole_id, eleve_id, passage_id, jour, type)
    values (new.ecole_id, new.eleve_id, new.id, jour_local, 'DUPLICATION_QR')
    on conflict do nothing;
  end if;

  if new.etat_validation = 'ACCEPTE' and exists (
    select 1 from public.passages precedent
    where precedent.badge_id = new.badge_id
      and precedent.id <> new.id
      and precedent.etat_validation = 'ACCEPTE'
      and abs(extract(epoch from precedent.heure_locale - new.heure_locale)) < 60
  ) then
    insert into public.anomalies (ecole_id, eleve_id, passage_id, jour, type)
    values (new.ecole_id, new.eleve_id, new.id, jour_local, 'DOUBLE_SCAN')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger passages_detecter_anomalies_evenement
after insert on public.passages
for each row execute function public.detecter_anomalies_evenement();
