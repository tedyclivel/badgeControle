-- Supports de badge et terminaux de contrôle. Les clés privées ne sont jamais
-- enregistrées ici : le serveur ne conserve que la clé publique du badge.

create type public.etat_badge as enum ('ACTIF', 'SUSPENDU', 'PERDU', 'REVOQUE');

create table public.appareils (
  id uuid primary key default gen_random_uuid(),
  ecole_id uuid not null references public.schools (id) on delete cascade,
  agent_id uuid not null,
  libelle text not null check (char_length(trim(libelle)) between 2 and 120),
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  unique (ecole_id, libelle),
  unique (id, ecole_id),
  foreign key (agent_id, ecole_id)
    references public.profiles (id, school_id)
    on delete restrict
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  ecole_id uuid not null,
  eleve_id uuid not null,
  cle_publique jsonb not null check (jsonb_typeof(cle_publique) = 'object'),
  empreinte_cle text not null check (empreinte_cle ~ '^[0-9a-f]{64}$'),
  etat public.etat_badge not null default 'ACTIF',
  emis_le timestamptz not null default now(),
  suspendu_le timestamptz,
  perdu_le timestamptz,
  revoque_le timestamptz,
  remplace_badge_id uuid references public.badges (id) on delete set null,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  unique (id, ecole_id),
  foreign key (eleve_id, ecole_id)
    references public.students (id, school_id)
    on delete restrict
);

create unique index badges_un_actif_par_eleve
  on public.badges (eleve_id)
  where etat = 'ACTIF';

create index appareils_ecole_id_idx on public.appareils (ecole_id);
create index appareils_agent_id_idx on public.appareils (agent_id);
create index badges_ecole_id_idx on public.badges (ecole_id);
create index badges_eleve_id_idx on public.badges (eleve_id);
create unique index badges_empreinte_cle_idx on public.badges (empreinte_cle);

create function public.definir_date_modification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.modifie_le = now();
  return new;
end;
$$;

create trigger appareils_definir_date_modification
before update on public.appareils
for each row execute function public.definir_date_modification();

create trigger badges_definir_date_modification
before update on public.badges
for each row execute function public.definir_date_modification();

create function public.emettre_badge(
  identifiant_eleve uuid,
  nouvelle_cle_publique jsonb,
  nouvelle_empreinte_cle text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  identifiant_ecole uuid;
  identifiant_ancien_badge uuid;
  identifiant_nouveau_badge uuid;
begin
  select school_id
  into identifiant_ecole
  from public.students
  where id = identifiant_eleve;

  if identifiant_ecole is null then
    raise exception 'Élève introuvable';
  end if;

  if not public.current_user_has_role_in_school('MANAGER', identifiant_ecole) then
    raise exception 'Action réservée au responsable de l''établissement'
      using errcode = '42501';
  end if;

  if jsonb_typeof(nouvelle_cle_publique) <> 'object' then
    raise exception 'La clé publique doit être un objet JSON';
  end if;

  if nouvelle_empreinte_cle !~ '^[0-9a-f]{64}$' then
    raise exception 'L''empreinte de clé doit être un SHA-256 hexadécimal';
  end if;

  select id
  into identifiant_ancien_badge
  from public.badges
  where eleve_id = identifiant_eleve
    and etat = 'ACTIF'
  for update;

  if identifiant_ancien_badge is not null then
    update public.badges
    set etat = 'REVOQUE',
        revoque_le = now()
    where id = identifiant_ancien_badge;
  end if;

  insert into public.badges (
    ecole_id,
    eleve_id,
    cle_publique,
    empreinte_cle,
    remplace_badge_id
  )
  values (
    identifiant_ecole,
    identifiant_eleve,
    nouvelle_cle_publique,
    nouvelle_empreinte_cle,
    identifiant_ancien_badge
  )
  returning id into identifiant_nouveau_badge;

  return identifiant_nouveau_badge;
end;
$$;

create function public.modifier_etat_badge(
  identifiant_badge uuid,
  nouvel_etat public.etat_badge
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  identifiant_ecole uuid;
begin
  select ecole_id
  into identifiant_ecole
  from public.badges
  where id = identifiant_badge
  for update;

  if identifiant_ecole is null then
    raise exception 'Badge introuvable';
  end if;

  if not public.current_user_has_role_in_school('MANAGER', identifiant_ecole) then
    raise exception 'Action réservée au responsable de l''établissement'
      using errcode = '42501';
  end if;

  update public.badges
  set etat = nouvel_etat,
      suspendu_le = case when nouvel_etat = 'SUSPENDU' then coalesce(suspendu_le, now()) else suspendu_le end,
      perdu_le = case when nouvel_etat = 'PERDU' then coalesce(perdu_le, now()) else perdu_le end,
      revoque_le = case when nouvel_etat = 'REVOQUE' then coalesce(revoque_le, now()) else revoque_le end
  where id = identifiant_badge;
end;
$$;

revoke all on function public.emettre_badge(uuid, jsonb, text) from public;
revoke all on function public.modifier_etat_badge(uuid, public.etat_badge) from public;
grant execute on function public.emettre_badge(uuid, jsonb, text) to authenticated;
grant execute on function public.modifier_etat_badge(uuid, public.etat_badge) to authenticated;

alter table public.appareils enable row level security;
alter table public.badges enable row level security;
revoke all on public.appareils, public.badges from anon, authenticated;
grant select on public.appareils, public.badges to authenticated;

create policy "responsables lisent les appareils de leur établissement"
on public.appareils for select to authenticated
using (public.current_user_has_role_in_school('MANAGER', ecole_id));

create policy "agents lisent leurs appareils actifs"
on public.appareils for select to authenticated
using (agent_id = auth.uid() and actif);

create policy "responsables lisent les badges de leur établissement"
on public.badges for select to authenticated
using (public.current_user_has_role_in_school('MANAGER', ecole_id));
