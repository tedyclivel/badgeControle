create type public.etat_validation_passage as enum ('ACCEPTE', 'REFUSE', 'A_REVOIR');
create type public.resultat_synchronisation as enum (
  'ACCEPTE', 'DEJA_SYNCHRONISE', 'CODE_DEJA_CONSOMME',
  'CODE_EXPIRE_A_L_HEURE_LOCALE', 'BADGE_INACTIF',
  'APPAREIL_NON_AUTORISE', 'POINT_DE_CONTROLE_INVALIDE', 'CODE_INTROUVABLE'
);

create table public.passages (
  id uuid primary key default gen_random_uuid(),
  ecole_id uuid not null,
  eleve_id uuid not null,
  badge_id uuid not null,
  code_qr_id uuid not null,
  appareil_id uuid not null,
  point_controle_id uuid not null,
  agent_id uuid not null,
  identifiant_evenement_local uuid not null,
  heure_locale timestamptz not null,
  recu_le timestamptz not null default now(),
  etat_validation public.etat_validation_passage not null,
  resultat_synchronisation public.resultat_synchronisation not null,
  unique (appareil_id, identifiant_evenement_local),
  foreign key (eleve_id, ecole_id) references public.students (id, school_id),
  foreign key (badge_id, ecole_id) references public.badges (id, ecole_id),
  foreign key (code_qr_id, ecole_id) references public.codes_qr_dynamiques (id, ecole_id),
  foreign key (appareil_id, ecole_id) references public.appareils (id, ecole_id),
  foreign key (point_controle_id, ecole_id) references public.checkpoints (id, school_id),
  foreign key (agent_id, ecole_id) references public.profiles (id, school_id)
);

create index passages_code_qr_id_idx on public.passages (code_qr_id);
create index passages_eleve_id_idx on public.passages (eleve_id, recu_le);

create function public.synchroniser_passage_serveur(
  p_identifiant_evenement_local uuid,
  p_identifiant_code_qr uuid,
  p_identifiant_appareil uuid,
  p_identifiant_point_controle uuid,
  p_identifiant_agent uuid,
  p_heure_locale timestamptz
)
returns public.resultat_synchronisation
language plpgsql
security definer
set search_path = public
as $$
declare
  code_qr public.codes_qr_dynamiques%rowtype;
  badge public.badges%rowtype;
  resultat public.resultat_synchronisation;
  etat public.etat_validation_passage;
begin
  select resultat_synchronisation into resultat
  from public.passages
  where appareil_id = p_identifiant_appareil
    and identifiant_evenement_local = p_identifiant_evenement_local;
  if resultat is not null then return 'DEJA_SYNCHRONISE'; end if;

  select * into code_qr from public.codes_qr_dynamiques where id = p_identifiant_code_qr for update;
  if code_qr.id is null then return 'CODE_INTROUVABLE'; end if;

  if not exists (
    select 1 from public.appareils
    where id = p_identifiant_appareil and ecole_id = code_qr.ecole_id
      and agent_id = p_identifiant_agent and actif
  ) then return 'APPAREIL_NON_AUTORISE'; end if;

  if not exists (
    select 1 from public.checkpoints
    where id = p_identifiant_point_controle and school_id = code_qr.ecole_id and active
  ) then return 'POINT_DE_CONTROLE_INVALIDE'; end if;

  select * into badge from public.badges where id = code_qr.badge_id and ecole_id = code_qr.ecole_id;
  if badge.etat <> 'ACTIF' then resultat := 'BADGE_INACTIF'; etat := 'REFUSE';
  elsif code_qr.etat = 'CONSOMME' then resultat := 'CODE_DEJA_CONSOMME'; etat := 'REFUSE';
  elsif p_heure_locale < code_qr.valable_depuis or p_heure_locale >= code_qr.valable_jusqu_a then resultat := 'CODE_EXPIRE_A_L_HEURE_LOCALE'; etat := 'A_REVOIR';
  else
    update public.codes_qr_dynamiques set etat = 'CONSOMME', consomme_le = now(), appareil_consommateur_id = p_identifiant_appareil, point_controle_consommateur_id = p_identifiant_point_controle where id = code_qr.id;
    resultat := 'ACCEPTE'; etat := 'ACCEPTE';
  end if;

  insert into public.passages (ecole_id, eleve_id, badge_id, code_qr_id, appareil_id, point_controle_id, agent_id, identifiant_evenement_local, heure_locale, etat_validation, resultat_synchronisation)
  values (code_qr.ecole_id, badge.eleve_id, badge.id, code_qr.id, p_identifiant_appareil, p_identifiant_point_controle, p_identifiant_agent, p_identifiant_evenement_local, p_heure_locale, etat, resultat);
  return resultat;
end;
$$;

revoke all on function public.synchroniser_passage_serveur(uuid, uuid, uuid, uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.synchroniser_passage_serveur(uuid, uuid, uuid, uuid, uuid, timestamptz) to service_role;

alter table public.passages enable row level security;
revoke all on public.passages from anon, authenticated;
grant select on public.passages to authenticated;
create policy "responsables lisent les passages de leur établissement"
on public.passages for select to authenticated
using (public.current_user_has_role_in_school('MANAGER', ecole_id));
