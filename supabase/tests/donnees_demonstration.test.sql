begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

select is((select count(*)::integer from public.classes), 7, 'les sept niveaux de 6e à Tle sont créés');
select ok((select min(effectif) >= 10 from (select count(*) as effectif from public.students group by class_id) effectifs), 'chaque classe possède au moins dix élèves');
select is((select count(*)::integer from public.badges), 75, 'chaque élève de démonstration possède un badge');
select is((select count(*)::integer from public.passages), 76, 'chaque élève de démonstration possède une présence');
select is((select count(*)::integer from public.anomalies where dedup_key like 'demo-%'), 5, 'les cinq anomalies sont présentes');
select cmp_ok((select count(*)::integer from public.outgoing_messages where status = 'PENDING'), '>=', 5, 'au moins un message en attente existe par anomalie de démonstration');

select * from finish();

rollback;
