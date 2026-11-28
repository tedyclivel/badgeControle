create type public.sync_result as enum ('ACCEPTED','ALREADY_SYNCED','QR_ALREADY_CONSUMED','QR_EXPIRED','BADGE_INACTIVE','DEVICE_UNAUTHORIZED','CHECKPOINT_INVALID','QR_NOT_FOUND');
create function public.synchroniser_passage_serveur(p_local_event_id uuid,p_qr_code_id uuid,p_device_id uuid,p_checkpoint_id uuid,p_agent_id uuid,p_local_time timestamptz,p_clock_offset_seconds integer default null) returns public.sync_result language plpgsql security definer set search_path=public as $$
declare c public.qr_codes%rowtype; b public.badges%rowtype; r public.sync_result; s public.passage_validation_status;
begin
 if exists(select 1 from passages where device_id=p_device_id and local_event_id=p_local_event_id) then return 'ALREADY_SYNCED'; end if;
 select * into c from qr_codes where id=p_qr_code_id for update; if c.id is null then return 'QR_NOT_FOUND'; end if;
 if not exists(select 1 from devices where id=p_device_id and school_id=c.school_id and agent_id=p_agent_id and active) then return 'DEVICE_UNAUTHORIZED'; end if;
 if not exists(select 1 from checkpoints where id=p_checkpoint_id and school_id=c.school_id and active) then return 'CHECKPOINT_INVALID'; end if;
 select * into b from badges where id=c.badge_id; if b.status<>'ACTIVE' then r:='BADGE_INACTIVE';s:='REJECTED'; elsif c.status='CONSUMED' then r:='QR_ALREADY_CONSUMED';s:='REJECTED'; elsif p_local_time<c.valid_from or p_local_time>=c.valid_until then r:='QR_EXPIRED';s:='REVIEW'; else update qr_codes set status='CONSUMED',consumed_at=now(),consumer_device_id=p_device_id,consumer_checkpoint_id=p_checkpoint_id where id=c.id;r:='ACCEPTED';s:='ACCEPTED';end if;
 insert into passages(school_id,student_id,badge_id,qr_code_id,checkpoint_id,device_id,agent_id,local_event_id,challenge_id,local_time,effective_time,clock_status,validation_status,sync_status,payload_hash) values(c.school_id,b.student_id,b.id,c.id,p_checkpoint_id,p_device_id,p_agent_id,p_local_event_id,p_qr_code_id,p_local_time,case when p_clock_offset_seconds is null then p_local_time else p_local_time-make_interval(secs=>p_clock_offset_seconds) end,case when p_clock_offset_seconds is null then 'UNRELIABLE'::public.clock_status else 'CORRECTED'::public.clock_status end,s,'PROCESSED',repeat('0',64)); return r;
end;$$;
revoke all on function public.synchroniser_passage_serveur(uuid,uuid,uuid,uuid,uuid,timestamptz,integer) from public;
grant execute on function public.synchroniser_passage_serveur(uuid,uuid,uuid,uuid,uuid,timestamptz,integer) to service_role;
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
