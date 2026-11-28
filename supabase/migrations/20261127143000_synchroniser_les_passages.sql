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
