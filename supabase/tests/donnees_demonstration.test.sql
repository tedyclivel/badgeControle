begin;

select plan(4);

select is((select count(*)::integer from public.badges), 5, 'cinq badges de démonstration sont créés');
select is((select count(*)::integer from public.passages), 6, 'les six passages de démonstration sont créés');
select is((select count(*)::integer from public.anomalies where dedup_key like 'demo-%'), 5, 'les cinq anomalies sont présentes');
select is((select count(*)::integer from public.outgoing_messages where status = 'SIMULATED'), 5, 'un message simulé existe par anomalie');

select * from finish();

rollback;
