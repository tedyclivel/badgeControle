begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(6);

insert into public.badges (id, ecole_id, eleve_id, cle_publique, empreinte_cle)
values (
  '00000000-0000-4000-8000-000000000501',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000111',
  '{"kty":"EC","crv":"P-256","x":"test-a","y":"test-b"}',
  repeat('d', 64)
);

insert into public.codes_qr_dynamiques (
  id, ecole_id, badge_id, numero_sequence, donnees_signees, signature_base64,
  valable_depuis, valable_jusqu_a
)
values (
  '00000000-0000-4000-8000-000000000601',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000501',
  1,
  '{"version":1,"identifiantBadge":"opaque","identifiantEcole":"opaque"}',
  repeat('a', 32),
  now() - interval '1 minute',
  now() + interval '4 minutes'
), (
  '00000000-0000-4000-8000-000000000602',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000501',
  2,
  '{"version":1,"identifiantBadge":"opaque","identifiantEcole":"opaque"}',
  repeat('b', 32),
  now() - interval '6 minutes',
  now() - interval '1 minute'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000012', true);

select is(
  public.consommer_code_qr(
    '00000000-0000-4000-8000-000000000601',
    '00000000-0000-4000-8000-000000000221',
    '00000000-0000-4000-8000-000000000201'
  ),
  'ACCEPTE'::public.resultat_consommation_qr,
  'Le premier scan d un code valide est accepté'
);
select is(
  public.consommer_code_qr(
    '00000000-0000-4000-8000-000000000601',
    '00000000-0000-4000-8000-000000000221',
    '00000000-0000-4000-8000-000000000201'
  ),
  'DEJA_CONSOMME'::public.resultat_consommation_qr,
  'Le second scan du même code est refusé'
);

reset role;
select is(
  (select etat from public.codes_qr_dynamiques where id = '00000000-0000-4000-8000-000000000601'),
  'CONSOMME'::public.etat_code_qr,
  'Le code accepté est marqué comme consommé'
);
select is(
  (select count(*) from public.tentatives_code_qr where code_qr_id = '00000000-0000-4000-8000-000000000601'),
  2::bigint,
  'Les deux tentatives sont tracées'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000012', true);
select is(
  public.consommer_code_qr(
    '00000000-0000-4000-8000-000000000602',
    '00000000-0000-4000-8000-000000000221',
    '00000000-0000-4000-8000-000000000201'
  ),
  'EXPIRE'::public.resultat_consommation_qr,
  'Un code expiré est refusé'
);
select is((select count(*) from public.codes_qr_dynamiques), 0::bigint, 'L agent ne lit pas les codes QR préparés');

select * from finish();
rollback;
