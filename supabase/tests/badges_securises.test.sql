begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(7);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000011', true);

select lives_ok(
  $$select public.emettre_badge(
    '00000000-0000-4000-8000-000000000111',
    '{"kty":"EC","crv":"P-256","x":"cle-publique-a","y":"cle-publique-b"}'::jsonb,
    repeat('a', 64)
  )$$,
  'Le responsable peut émettre un badge'
);
select is(
  (select count(*) from public.badges where eleve_id = '00000000-0000-4000-8000-000000000111' and etat = 'ACTIF'),
  1::bigint,
  'Un élève ne possède qu un badge actif'
);

select lives_ok(
  $$select public.emettre_badge(
    '00000000-0000-4000-8000-000000000111',
    '{"kty":"EC","crv":"P-256","x":"nouvelle-cle-a","y":"nouvelle-cle-b"}'::jsonb,
    repeat('b', 64)
  )$$,
  'La réémission du badge réussit'
);
select is(
  (select count(*) from public.badges where eleve_id = '00000000-0000-4000-8000-000000000111' and etat = 'ACTIF'),
  1::bigint,
  'La réémission conserve un seul badge actif'
);
select is(
  (select count(*) from public.badges where eleve_id = '00000000-0000-4000-8000-000000000111' and etat = 'REVOQUE'),
  1::bigint,
  'La réémission révoque immédiatement le badge précédent'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000012', true);
select is((select count(*) from public.badges), 0::bigint, 'L agent ne lit aucun badge');
select throws_ok(
  $$select public.emettre_badge(
    '00000000-0000-4000-8000-000000000112',
    '{"kty":"EC","crv":"P-256","x":"cle-agent-a","y":"cle-agent-b"}'::jsonb,
    repeat('c', 64)
  )$$,
  '42501',
  'Action réservée au responsable de l''établissement',
  'L agent ne peut pas émettre un badge'
);

select * from finish();
rollback;
