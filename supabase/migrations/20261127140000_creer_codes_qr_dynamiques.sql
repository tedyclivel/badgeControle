-- Consommation atomique d'un QR pré-signé du schéma métier commun.
create function public.consommer_code_qr(identifiant_code uuid, identifiant_appareil uuid, identifiant_point uuid)
returns public.qr_attempt_result language plpgsql security definer set search_path = public, auth as $$
declare code public.qr_codes%rowtype; resultat public.qr_attempt_result; agent_connecte uuid := auth.uid();
begin
  select * into code from public.qr_codes where id = identifiant_code for update;
  if code.id is null then return 'CODE_NOT_FOUND'; end if;
  if not public.current_user_has_role_in_school('AGENT', code.school_id) or not exists (select 1 from public.devices where id = identifiant_appareil and school_id = code.school_id and agent_id = agent_connecte and active) then return 'DEVICE_UNAUTHORIZED'; end if;
  if not exists (select 1 from public.checkpoints where id = identifiant_point and school_id = code.school_id and active) then return 'CHECKPOINT_INVALID'; end if;
  if not exists (select 1 from public.badges where id = code.badge_id and school_id = code.school_id and status = 'ACTIVE') then resultat := 'BADGE_INACTIVE';
  elsif code.status = 'CONSUMED' then resultat := 'ALREADY_CONSUMED';
  elsif code.status <> 'PREPARED' or now() < code.valid_from or now() >= code.valid_until then resultat := 'EXPIRED';
  else
    update public.qr_codes set status = 'CONSUMED', consumed_at = now(), consumer_device_id = identifiant_appareil, consumer_checkpoint_id = identifiant_point where id = code.id;
    resultat := 'ACCEPTED';
  end if;
  insert into public.qr_attempts (school_id, qr_code_id, badge_id, device_id, checkpoint_id, agent_id, result)
  values (code.school_id, code.id, code.badge_id, identifiant_appareil, identifiant_point, agent_connecte, resultat);
  return resultat;
end;
$$;
revoke all on function public.consommer_code_qr(uuid, uuid, uuid) from public;
grant execute on function public.consommer_code_qr(uuid, uuid, uuid) to authenticated;
-- Codes QR pré-signés et consommables une seule fois.
-- La signature est produite par une fonction serveur ; aucune clé privée n'est
-- stockée dans PostgreSQL ni transmise au navigateur.

create type public.etat_code_qr as enum ('PREPARE', 'CONSOMME', 'ANNULE');
create type public.resultat_consommation_qr as enum (
  'ACCEPTE',
  'DEJA_CONSOMME',
  'EXPIRE',
  'BADGE_INACTIF',
  'APPAREIL_NON_AUTORISE',
  'POINT_DE_CONTROLE_INVALIDE',
  'CODE_INTROUVABLE'
);

create table public.codes_qr_dynamiques (
  id uuid primary key default gen_random_uuid(),
  ecole_id uuid not null,
  badge_id uuid not null,
  numero_sequence integer not null check (numero_sequence > 0),
  donnees_signees jsonb not null check (jsonb_typeof(donnees_signees) = 'object'),
  signature_base64 text not null check (char_length(signature_base64) > 20),
  valable_depuis timestamptz not null,
  valable_jusqu_a timestamptz not null,
  etat public.etat_code_qr not null default 'PREPARE',
  consomme_le timestamptz,
  appareil_consommateur_id uuid,
  point_controle_consommateur_id uuid,
  cree_le timestamptz not null default now(),
  check (valable_jusqu_a > valable_depuis),
  check (valable_jusqu_a <= valable_depuis + interval '5 minutes'),
  unique (id, ecole_id),
  unique (badge_id, numero_sequence),
  foreign key (badge_id, ecole_id)
    references public.badges (id, ecole_id)
    on delete restrict,
  foreign key (appareil_consommateur_id, ecole_id)
    references public.appareils (id, ecole_id)
    on delete restrict,
  foreign key (point_controle_consommateur_id, ecole_id)
    references public.checkpoints (id, school_id)
    on delete restrict
);

create table public.tentatives_code_qr (
  id uuid primary key default gen_random_uuid(),
  ecole_id uuid not null,
  code_qr_id uuid not null,
  badge_id uuid not null,
  appareil_id uuid not null,
  point_controle_id uuid not null,
  agent_id uuid not null,
  resultat public.resultat_consommation_qr not null,
  tente_le timestamptz not null default now(),
  cree_le timestamptz not null default now(),
  foreign key (code_qr_id, ecole_id)
    references public.codes_qr_dynamiques (id, ecole_id)
    on delete restrict,
  foreign key (badge_id, ecole_id)
    references public.badges (id, ecole_id)
    on delete restrict,
  foreign key (appareil_id, ecole_id)
    references public.appareils (id, ecole_id)
    on delete restrict,
  foreign key (point_controle_id, ecole_id)
    references public.checkpoints (id, school_id)
    on delete restrict,
  foreign key (agent_id, ecole_id)
    references public.profiles (id, school_id)
    on delete restrict
);

create index codes_qr_dynamiques_badge_id_idx on public.codes_qr_dynamiques (badge_id);
create index codes_qr_dynamiques_validite_idx on public.codes_qr_dynamiques (valable_jusqu_a);
create index tentatives_code_qr_code_qr_id_idx on public.tentatives_code_qr (code_qr_id);
create index tentatives_code_qr_badge_id_idx on public.tentatives_code_qr (badge_id);

create function public.consommer_code_qr(
  identifiant_code_qr uuid,
  identifiant_appareil uuid,
  identifiant_point_controle uuid
)
returns public.resultat_consommation_qr
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  code_qr public.codes_qr_dynamiques%rowtype;
  badge public.badges%rowtype;
  resultat public.resultat_consommation_qr;
  agent_connecte uuid := auth.uid();
begin
  select *
  into code_qr
  from public.codes_qr_dynamiques
  where id = identifiant_code_qr
  for update;

  if code_qr.id is null then
    return 'CODE_INTROUVABLE';
  end if;

  if not public.current_user_has_role_in_school('AGENT', code_qr.ecole_id)
    or not exists (
    select 1
    from public.appareils
    where id = identifiant_appareil
      and ecole_id = code_qr.ecole_id
      and agent_id = agent_connecte
      and actif
  ) then
    return 'APPAREIL_NON_AUTORISE';
  end if;

  if not exists (
    select 1
    from public.checkpoints
    where id = identifiant_point_controle
      and school_id = code_qr.ecole_id
      and active
  ) then
    return 'POINT_DE_CONTROLE_INVALIDE';
  end if;

  select *
  into badge
  from public.badges
  where id = code_qr.badge_id
    and ecole_id = code_qr.ecole_id;

  if badge.etat <> 'ACTIF' then
    resultat := 'BADGE_INACTIF';
  elsif code_qr.etat = 'CONSOMME' then
    resultat := 'DEJA_CONSOMME';
  elsif code_qr.etat <> 'PREPARE' or now() < code_qr.valable_depuis or now() >= code_qr.valable_jusqu_a then
    resultat := 'EXPIRE';
  else
    update public.codes_qr_dynamiques
    set etat = 'CONSOMME',
        consomme_le = now(),
        appareil_consommateur_id = identifiant_appareil,
        point_controle_consommateur_id = identifiant_point_controle
    where id = code_qr.id;
    resultat := 'ACCEPTE';
  end if;

  insert into public.tentatives_code_qr (
    ecole_id,
    code_qr_id,
    badge_id,
    appareil_id,
    point_controle_id,
    agent_id,
    resultat
  )
  values (
    code_qr.ecole_id,
    code_qr.id,
    code_qr.badge_id,
    identifiant_appareil,
    identifiant_point_controle,
    agent_connecte,
    resultat
  );

  return resultat;
end;
$$;

revoke all on function public.consommer_code_qr(uuid, uuid, uuid) from public;
grant execute on function public.consommer_code_qr(uuid, uuid, uuid) to authenticated;

alter table public.codes_qr_dynamiques enable row level security;
alter table public.tentatives_code_qr enable row level security;
revoke all on public.codes_qr_dynamiques, public.tentatives_code_qr from anon, authenticated;
grant select on public.codes_qr_dynamiques, public.tentatives_code_qr to authenticated;

create policy "responsables lisent les codes QR de leur établissement"
on public.codes_qr_dynamiques for select to authenticated
using (public.current_user_has_role_in_school('MANAGER', ecole_id));

create policy "responsables lisent les tentatives de leur établissement"
on public.tentatives_code_qr for select to authenticated
using (public.current_user_has_role_in_school('MANAGER', ecole_id));
