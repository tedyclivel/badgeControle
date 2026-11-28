begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(4);

insert into public.qr_codes (id, school_id, badge_id, sequence_number, signed_payload, signature_base64, valid_from, valid_until)
values
('00000000-0000-4000-8000-0000000007a1','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000601',10,'{}',repeat('a',32),now()-interval '1 minute',now()+interval '4 minutes'),
('00000000-0000-4000-8000-0000000007a2','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000601',11,'{}',repeat('b',32),now()-interval '6 minutes',now()-interval '1 minute');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',true);
select is(public.consommer_code_qr('00000000-0000-4000-8000-0000000007a1','00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000201'),'ACCEPTED'::public.qr_attempt_result,'Le premier scan est accepté');
select is(public.consommer_code_qr('00000000-0000-4000-8000-0000000007a1','00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000201'),'ALREADY_CONSUMED'::public.qr_attempt_result,'Le rejeu est refusé');
select is(public.consommer_code_qr('00000000-0000-4000-8000-0000000007a2','00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000201'),'EXPIRED'::public.qr_attempt_result,'Un QR expiré est refusé');
reset role;
select is((select count(*) from public.qr_attempts where qr_code_id = '00000000-0000-4000-8000-0000000007a1'),2::bigint,'Les tentatives sont tracées');
select * from finish(); rollback;
