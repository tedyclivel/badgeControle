-- Cycle de vie des badges. Les tables badges et devices sont créées dans le
-- schéma métier commun ; cette migration ne contient que les opérations sûres.

create function public.emettre_badge(identifiant_eleve uuid, nouvelle_cle_publique jsonb, nouvelle_empreinte_cle text)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare identifiant_ecole uuid; identifiant_ancien_badge uuid; identifiant_nouveau_badge uuid;
begin
  select school_id into identifiant_ecole from public.students where id = identifiant_eleve and active;
  if identifiant_ecole is null then raise exception 'Élève introuvable'; end if;
  if not public.current_user_has_role_in_school('MANAGER', identifiant_ecole) then raise exception 'Action réservée au responsable de l''établissement' using errcode = '42501'; end if;
  if jsonb_typeof(nouvelle_cle_publique) <> 'object' then raise exception 'La clé publique doit être un objet JSON'; end if;
  if nouvelle_empreinte_cle !~ '^[0-9a-f]{64}$' then raise exception 'L''empreinte de clé doit être un SHA-256 hexadécimal'; end if;
  select id into identifiant_ancien_badge from public.badges where student_id = identifiant_eleve and status = 'ACTIVE' for update;
  if identifiant_ancien_badge is not null then update public.badges set status = 'REVOKED', revoked_at = now() where id = identifiant_ancien_badge; end if;
  insert into public.badges (school_id, student_id, public_key, key_fingerprint, replaces_badge_id)
  values (identifiant_ecole, identifiant_eleve, nouvelle_cle_publique, nouvelle_empreinte_cle, identifiant_ancien_badge)
  returning id into identifiant_nouveau_badge;
  return identifiant_nouveau_badge;
end;
$$;

create function public.modifier_etat_badge(identifiant_badge uuid, nouvel_etat public.badge_status)
returns void language plpgsql security definer set search_path = public, auth as $$
declare identifiant_ecole uuid;
begin
  select school_id into identifiant_ecole from public.badges where id = identifiant_badge for update;
  if identifiant_ecole is null then raise exception 'Badge introuvable'; end if;
  if not public.current_user_has_role_in_school('MANAGER', identifiant_ecole) then raise exception 'Action réservée au responsable de l''établissement' using errcode = '42501'; end if;
  update public.badges set status = nouvel_etat, revoked_at = case when nouvel_etat = 'REVOKED' then coalesce(revoked_at, now()) else revoked_at end where id = identifiant_badge;
end;
$$;

revoke all on function public.emettre_badge(uuid, jsonb, text), public.modifier_etat_badge(uuid, public.badge_status) from public;
grant execute on function public.emettre_badge(uuid, jsonb, text), public.modifier_etat_badge(uuid, public.badge_status) to authenticated;
