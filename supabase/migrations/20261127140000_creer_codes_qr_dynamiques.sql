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
