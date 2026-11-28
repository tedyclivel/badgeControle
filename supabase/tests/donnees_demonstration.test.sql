begin;

select plan(4);

select is((select count(*)::integer from public.badges), 5, 'cinq badges de démonstration sont créés');
select is((select count(*)::integer from public.passages), 6, 'les six passages de démonstration sont créés');
select is((select count(*)::integer from public.anomalies where dedup_key like 'demo-%'), 5, 'les cinq anomalies sont présentes');
select cmp_ok((select count(*)::integer from public.outgoing_messages where status = 'PENDING'), '>=', 5, 'au moins un message en attente existe par anomalie de démonstration');

select * from finish();

rollback;
