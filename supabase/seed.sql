-- Données fictives reproductibles pour la démonstration locale.
-- Mot de passe de tous les comptes : Passage2026!

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'responsable@demo.passage.test', extensions.crypt('Passage2026!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'agent@demo.passage.test', extensions.crypt('Passage2026!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000021', 'authenticated', 'authenticated', 'parent.a@demo.passage.test', extensions.crypt('Passage2026!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000022', 'authenticated', 'authenticated', 'parent.b@demo.passage.test', extensions.crypt('Passage2026!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
on conflict (id) do update
set email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    raw_app_meta_data = excluded.raw_app_meta_data,
    updated_at = now();

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
values
  ('responsable@demo.passage.test', '00000000-0000-4000-8000-000000000011', '{"sub":"00000000-0000-4000-8000-000000000011","email":"responsable@demo.passage.test","email_verified":true,"phone_verified":false}', 'email', now(), now(), now()),
  ('agent@demo.passage.test', '00000000-0000-4000-8000-000000000012', '{"sub":"00000000-0000-4000-8000-000000000012","email":"agent@demo.passage.test","email_verified":true,"phone_verified":false}', 'email', now(), now(), now()),
  ('parent.a@demo.passage.test', '00000000-0000-4000-8000-000000000021', '{"sub":"00000000-0000-4000-8000-000000000021","email":"parent.a@demo.passage.test","email_verified":true,"phone_verified":false}', 'email', now(), now(), now()),
  ('parent.b@demo.passage.test', '00000000-0000-4000-8000-000000000022', '{"sub":"00000000-0000-4000-8000-000000000022","email":"parent.b@demo.passage.test","email_verified":true,"phone_verified":false}', 'email', now(), now(), now())
on conflict (provider_id, provider) do update
set identity_data = excluded.identity_data,
    user_id = excluded.user_id,
    updated_at = now();

insert into public.schools (id, name, timezone, daily_message_limit)
values ('00000000-0000-4000-8000-000000000001', 'Collège Démonstration de Yaoundé', 'Africa/Douala', 3)
on conflict (id) do update
set name = excluded.name,
    timezone = excluded.timezone,
    daily_message_limit = excluded.daily_message_limit;

insert into public.profiles (id, school_id, full_name, role)
values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'Amina Responsable', 'MANAGER'),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 'Benoît Agent', 'AGENT'),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', 'Clara Parent', 'PARENT'),
  ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000001', 'David Parent', 'PARENT')
on conflict (id) do update
set school_id = excluded.school_id,
    full_name = excluded.full_name,
    role = excluded.role,
    active = true;

insert into public.classes (id, school_id, name)
values ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', '6e A')
on conflict (id) do update
set school_id = excluded.school_id,
    name = excluded.name;

insert into public.students (id, school_id, class_id, full_name)
values
  ('00000000-0000-4000-8000-000000000111', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'Élève Alpha'),
  ('00000000-0000-4000-8000-000000000112', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'Élève Bravo'),
  ('00000000-0000-4000-8000-000000000113', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'Élève Charlie'),
  ('00000000-0000-4000-8000-000000000114', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'Élève Delta'),
  ('00000000-0000-4000-8000-000000000115', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'Élève Echo')
on conflict (id) do update
set school_id = excluded.school_id,
    class_id = excluded.class_id,
    full_name = excluded.full_name,
    active = true;

insert into public.parent_students (school_id, parent_id, student_id)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000111'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000112'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000113'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000114'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000115')
on conflict (parent_id, student_id) do nothing;

insert into public.checkpoints (id, school_id, label, type)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000001', 'Portail principal', 'ENTRY'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000001', 'Portail de sortie', 'EXIT')
on conflict (id) do update
set school_id = excluded.school_id,
    label = excluded.label,
    type = excluded.type,
    active = true;

insert into public.appareils (id, ecole_id, agent_id, libelle)
values ('00000000-0000-4000-8000-000000000221', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'Terminal portail principal')
on conflict (id) do update
set ecole_id = excluded.ecole_id,
    agent_id = excluded.agent_id,
    libelle = excluded.libelle,
    actif = true;

insert into public.itineraries (id, school_id, student_id, valid_from, active)
values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000111', '2026-11-01', true),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000112', '2026-11-01', true),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000113', '2026-11-01', true),
  ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000114', '2026-11-01', true),
  ('00000000-0000-4000-8000-000000000305', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000115', '2026-11-01', true)
on conflict (id) do update
set school_id = excluded.school_id,
    student_id = excluded.student_id,
    valid_from = excluded.valid_from,
    valid_until = excluded.valid_until,
    active = excluded.active;

insert into public.time_windows (id, school_id, itinerary_id, checkpoint_id, position, starts_at, ends_at, weekdays)
select
  ('00000000-0000-4000-8000-0000000004' || lpad(((student_offset - 1) * 2 + window_offset)::text, 2, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  ('00000000-0000-4000-8000-00000000030' || student_offset)::uuid,
  (case when window_offset = 1 then '00000000-0000-4000-8000-000000000201' else '00000000-0000-4000-8000-000000000202' end)::uuid,
  window_offset,
  case when window_offset = 1 then time '07:00' else time '15:30' end,
  case when window_offset = 1 then time '07:45' else time '16:15' end,
  array[1, 2, 3, 4, 5]::smallint[]
from generate_series(1, 5) as student_offset
cross join generate_series(1, 2) as window_offset
on conflict (itinerary_id, position) do update
set checkpoint_id = excluded.checkpoint_id,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    weekdays = excluded.weekdays;

-- Scénarios métier figés du vendredi 27 novembre 2026. Ils servent à la
-- démonstration et aux futures suites d'intégration ; aucune donnée réelle.
insert into public.devices (id, school_id, agent_id, label)
values ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'Terminal portail principal')
on conflict (id) do update set active = true, label = excluded.label;

insert into public.badges (id, school_id, student_id, public_key, key_fingerprint)
select
  ('00000000-0000-4000-8000-00000000060' || student_offset)::uuid,
  '00000000-0000-4000-8000-000000000001',
  ('00000000-0000-4000-8000-00000000011' || student_offset)::uuid,
  jsonb_build_object('kty', 'OKP', 'crv', 'Ed25519', 'x', 'demonstration-' || student_offset),
  repeat(lower(to_hex(student_offset)), 64)
from generate_series(1, 5) as student_offset
on conflict (id) do update
set public_key = excluded.public_key, key_fingerprint = excluded.key_fingerprint, status = 'ACTIVE';

insert into public.qr_codes (id, school_id, badge_id, sequence_number, signed_payload, signature_base64, valid_from, valid_until, status, consumed_at, consumer_device_id, consumer_checkpoint_id)
values
  ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000601', 1, '{"scenario":"normal"}', 'signature-demo-001-normal', '2026-11-27 07:00+01', '2026-11-27 07:05+01', 'CONSUMED', '2026-11-27 07:10+01', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000201'),
  ('00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000602', 1, '{"scenario":"hors-fenetre"}', 'signature-demo-002-outside', '2026-11-27 08:00+01', '2026-11-27 08:05+01', 'CONSUMED', '2026-11-27 08:10+01', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000201'),
  ('00000000-0000-4000-8000-000000000703', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000603', 1, '{"scenario":"point-inattendu"}', 'signature-demo-003-unexpected', '2026-11-27 07:00+01', '2026-11-27 07:05+01', 'CONSUMED', '2026-11-27 07:10+01', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000202'),
  ('00000000-0000-4000-8000-000000000704', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000604', 1, '{"scenario":"double-scan-1"}', 'signature-demo-004-duplicate-a', '2026-11-27 07:00+01', '2026-11-27 07:05+01', 'CONSUMED', '2026-11-27 07:10+01', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000201'),
  ('00000000-0000-4000-8000-000000000705', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000604', 2, '{"scenario":"double-scan-2"}', 'signature-demo-004-duplicate-b', '2026-11-27 07:00+01', '2026-11-27 07:05+01', 'CONSUMED', '2026-11-27 07:10+01', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000201'),
  ('00000000-0000-4000-8000-000000000706', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000605', 1, '{"scenario":"horloge-incertaine"}', 'signature-demo-005-clock', '2026-11-27 07:00+01', '2026-11-27 07:05+01', 'CONSUMED', '2026-11-27 07:10+01', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000201')
on conflict (id) do update set status = excluded.status, consumed_at = excluded.consumed_at;

insert into public.passages (id, school_id, student_id, badge_id, qr_code_id, checkpoint_id, device_id, agent_id, local_event_id, challenge_id, local_time, effective_time, clock_status, validation_status, sync_status, payload_hash)
values
  ('00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000111', '00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000a01', '2026-11-27 07:10+01', '2026-11-27 07:10+01', 'TRUSTED', 'ACCEPTED', 'PROCESSED', repeat('a', 64)),
  ('00000000-0000-4000-8000-000000000802', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000112', '00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000a02', '2026-11-27 08:10+01', '2026-11-27 08:10+01', 'TRUSTED', 'ACCEPTED', 'PROCESSED', repeat('b', 64)),
  ('00000000-0000-4000-8000-000000000803', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000113', '00000000-0000-4000-8000-000000000603', '00000000-0000-4000-8000-000000000703', '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000a03', '2026-11-27 07:10+01', '2026-11-27 07:10+01', 'TRUSTED', 'ACCEPTED', 'PROCESSED', repeat('c', 64)),
  ('00000000-0000-4000-8000-000000000804', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000114', '00000000-0000-4000-8000-000000000604', '00000000-0000-4000-8000-000000000704', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000904', '00000000-0000-4000-8000-000000000a04', '2026-11-27 07:10+01', '2026-11-27 07:10+01', 'TRUSTED', 'ACCEPTED', 'PROCESSED', repeat('d', 64)),
  ('00000000-0000-4000-8000-000000000805', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000114', '00000000-0000-4000-8000-000000000604', '00000000-0000-4000-8000-000000000705', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000905', '00000000-0000-4000-8000-000000000a05', '2026-11-27 07:10:30+01', '2026-11-27 07:10:30+01', 'TRUSTED', 'ACCEPTED', 'PROCESSED', repeat('e', 64)),
  ('00000000-0000-4000-8000-000000000806', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000115', '00000000-0000-4000-8000-000000000605', '00000000-0000-4000-8000-000000000706', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000906', '00000000-0000-4000-8000-000000000a06', '2026-11-27 09:10+01', null, 'UNRELIABLE', 'REVIEW', 'PROCESSED', repeat('f', 64))
on conflict (id) do nothing;

insert into public.schedule_exceptions (id, school_id, student_id, day, type, reason)
values ('00000000-0000-4000-8000-000000000b01', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000115', '2026-11-28', 'EXCUSED_ABSENCE', 'Absence justifiée de démonstration')
on conflict (id) do update set reason = excluded.reason;

insert into public.anomalies (id, school_id, student_id, passage_id, time_window_id, day, type, dedup_key)
values
  ('00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000111', null, '00000000-0000-4000-8000-000000000402', '2026-11-27', 'MISSING', 'demo-alpha-missing-exit'),
  ('00000000-0000-4000-8000-000000000c02', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000112', '00000000-0000-4000-8000-000000000802', '00000000-0000-4000-8000-000000000403', '2026-11-27', 'OUTSIDE_WINDOW', 'demo-bravo-outside-window'),
  ('00000000-0000-4000-8000-000000000c03', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000113', '00000000-0000-4000-8000-000000000803', null, '2026-11-27', 'UNEXPECTED_CHECKPOINT', 'demo-charlie-unexpected-checkpoint'),
  ('00000000-0000-4000-8000-000000000c04', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000114', '00000000-0000-4000-8000-000000000805', null, '2026-11-27', 'DUPLICATE_SCAN', 'demo-delta-duplicate-scan'),
  ('00000000-0000-4000-8000-000000000c05', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000115', '00000000-0000-4000-8000-000000000806', null, '2026-11-27', 'UNRELIABLE_CLOCK', 'demo-echo-unreliable-clock')
on conflict (id) do nothing;

insert into public.outgoing_messages (id, school_id, student_id, parent_id, anomaly_id, day, text, status)
select
  ('00000000-0000-4000-8000-000000000d0' || row_number() over (order by anomaly.id))::uuid,
  anomaly.school_id, anomaly.student_id, link.parent_id, anomaly.id, anomaly.day,
  'Une situation nécessite votre attention. Veuillez contacter l’établissement.', 'SIMULATED'
from public.anomalies anomaly
join public.parent_students link on link.student_id = anomaly.student_id
where anomaly.dedup_key like 'demo-%'
on conflict (anomaly_id, parent_id) do nothing;
insert into public.exceptions_calendrier (id, ecole_id, eleve_id, jour, type, motif)
values ('00000000-0000-4000-8000-000000000451', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000115', '2026-11-28', 'ABSENCE_JUSTIFIEE', 'Absence de démonstration')
on conflict (id) do update
set jour = excluded.jour,
    type = excluded.type,
    motif = excluded.motif;
