create type public.etat_message_sortant as enum ('EN_ATTENTE', 'SIMULE', 'SUPPRIME', 'ECHEC');

create table public.messages_sortants (
  id uuid primary key default gen_random_uuid(),
  ecole_id uuid not null,
  eleve_id uuid not null,
  parent_id uuid not null,
  anomalie_id uuid not null references public.anomalies (id) on delete cascade,
  jour date not null,
  texte text not null check (char_length(trim(texte)) between 1 and 500),
  etat public.etat_message_sortant not null,
  motif_suppression text,
  cree_le timestamptz not null default now(),
  unique (anomalie_id, parent_id),
  foreign key (eleve_id, ecole_id) references public.students (id, school_id),
  foreign key (parent_id, ecole_id) references public.profiles (id, school_id)
);

create index messages_sortants_plafond_idx on public.messages_sortants (eleve_id, jour, etat);
alter table public.messages_sortants enable row level security;
revoke all on public.messages_sortants from anon, authenticated;
grant select on public.messages_sortants to authenticated;
create policy "responsables lisent les messages de leur établissement"
on public.messages_sortants for select to authenticated
using (public.current_user_has_role_in_school('MANAGER', ecole_id));

create function public.preparer_messages_anomalie(identifiant_anomalie uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare anomalie public.anomalies%rowtype; plafond integer; nombre integer := 0; parent record; total integer;
begin
  select * into anomalie from public.anomalies where id = identifiant_anomalie;
  if anomalie.id is null then raise exception 'Anomalie introuvable'; end if;
  select daily_message_limit into plafond from public.schools where id = anomalie.ecole_id;
  for parent in select parent_id from public.parent_students where student_id = anomalie.eleve_id loop
    select count(*) into total from public.messages_sortants where eleve_id = anomalie.eleve_id and jour = anomalie.jour and etat in ('EN_ATTENTE','SIMULE');
    insert into public.messages_sortants (ecole_id, eleve_id, parent_id, anomalie_id, jour, texte, etat, motif_suppression)
    values (anomalie.ecole_id, anomalie.eleve_id, parent.parent_id, anomalie.id, anomalie.jour,
      'Une situation nécessite votre attention. Veuillez contacter l’établissement.',
      case when total < plafond then 'EN_ATTENTE' else 'SUPPRIME' end,
      case when total < plafond then null else 'Plafond quotidien atteint' end)
    on conflict (anomalie_id, parent_id) do nothing;
    nombre := nombre + 1;
  end loop;
  return nombre;
end;
$$;
