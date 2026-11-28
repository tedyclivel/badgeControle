alter type public.resultat_synchronisation add value if not exists 'HORLOGE_INCERTAINE';

alter table public.passages
  add column reference_serveur timestamptz,
  add column decalage_horloge_secondes integer;

create function public.verifier_horloge_passage()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.decalage_horloge_secondes is not null and abs(new.decalage_horloge_secondes) > 600 then
    new.etat_validation := 'A_REVOIR';
    new.resultat_synchronisation := 'HORLOGE_INCERTAINE';
  end if;
  return new;
end;
$$;

create trigger passages_verifier_horloge
before insert on public.passages
for each row execute function public.verifier_horloge_passage();

create or replace function public.enregistrer_anomalie_horloge()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.resultat_synchronisation = 'HORLOGE_INCERTAINE' then
    insert into public.anomalies (ecole_id, eleve_id, passage_id, jour, type)
    values (new.ecole_id, new.eleve_id, new.id, (new.heure_locale at time zone 'Africa/Douala')::date, 'HORLOGE_INCERTAINE')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger passages_enregistrer_anomalie_horloge
after insert on public.passages
for each row execute function public.enregistrer_anomalie_horloge();
