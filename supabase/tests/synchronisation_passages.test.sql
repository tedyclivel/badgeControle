begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(5);

insert into public.badges (id, ecole_id, eleve_id, cle_publique, empreinte_cle)
values ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000111', '{"kty":"EC"}', repeat('e', 64));
insert into public.codes_qr_dynamiques (id, ecole_id, badge_id, numero_sequence, donnees_signees, signature_base64, valable_depuis, valable_jusqu_a)
values ('00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000701', 1, '{"version":1}', repeat('z', 32), now() - interval '1 minute', now() + interval '4 minutes');

select is(
  public.synchroniser_passage_serveur('00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000221', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000012', now()),
  'ACCEPTE'::public.resultat_synchronisation,
  'Le premier événement est accepté'
);
select is(
  public.synchroniser_passage_serveur('00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000221', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000012', now()),
  'DEJA_SYNCHRONISE'::public.resultat_synchronisation,
  'La retransmission du même événement est idempotente'
);
select is((select count(*) from public.passages), 1::bigint, 'La retransmission ne crée pas de doublon');
select is(
  public.synchroniser_passage_serveur('00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000221', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000012', now()),
  'CODE_DEJA_CONSOMME'::public.resultat_synchronisation,
  'Un second événement sur le même QR est refusé'
);
select is((select count(*) from public.passages where etat_validation = 'REFUSE'), 1::bigint, 'Le refus concurrent est conservé dans l historique');

select * from finish();
rollback;
