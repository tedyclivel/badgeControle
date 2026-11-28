begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(3);
insert into public.qr_codes (id,school_id,badge_id,sequence_number,signed_payload,signature_base64,valid_from,valid_until) values ('00000000-0000-4000-8000-0000000007b1','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000601',20,'{}',repeat('a',32),now()-interval '1 minute',now()+interval '4 minutes');
select is(public.synchroniser_passage_serveur('00000000-0000-4000-8000-0000000009b1','00000000-0000-4000-8000-0000000007b1','00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000012',now(),120),'ACCEPTED'::public.sync_result,'Le premier événement est accepté');
select is(public.synchroniser_passage_serveur('00000000-0000-4000-8000-0000000009b1','00000000-0000-4000-8000-0000000007b1','00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000012',now(),120),'ALREADY_SYNCED'::public.sync_result,'La retransmission est idempotente');
select is((select clock_status from public.passages where local_event_id='00000000-0000-4000-8000-0000000009b1'),'CORRECTED'::public.clock_status,'Le décalage est transmis');
select * from finish(); rollback;
