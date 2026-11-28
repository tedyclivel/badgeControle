begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(3);

select is(public.detecter_passages_manquants('2026-11-27 16:20:00+01'), 6, 'Les fenêtres closes sans passage créent des anomalies');
select is((select count(*) from public.anomalies where type = 'MISSING'), 7::bigint, 'Les anomalies manquantes sont conservées');
select is(public.detecter_passages_manquants('2026-11-27 16:20:00+01'), 10, 'Les fenêtres closes sans passage créent des anomalies');
select is((select count(*) from public.anomalies where type = 'PASSAGE_MANQUANT'), 10::bigint, 'Les anomalies manquantes sont conservées');
select is(public.detecter_passages_manquants('2026-11-27 16:20:00+01'), 0, 'Une seconde détection ne crée pas de doublon');

select * from finish();
rollback;
