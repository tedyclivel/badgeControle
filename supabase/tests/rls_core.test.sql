begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(6);

set local role authenticated;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000021', true);
select is((select count(*) from public.students), 2::bigint, 'Le premier parent ne lit que ses deux enfants');
select is((select count(*) from public.students where id = '00000000-0000-4000-8000-000000000113'), 0::bigint, 'Le premier parent ne lit pas un enfant du second parent');
select is((select count(*) from public.parent_students), 2::bigint, 'Le premier parent ne lit que ses propres rattachements');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000012', true);
select is((select count(*) from public.students), 0::bigint, 'L agent ne lit aucun élève');
select is((select count(*) from public.checkpoints), 2::bigint, 'L agent lit les points de contrôle de son établissement');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000011', true);
select is((select count(*) from public.students), 5::bigint, 'Le responsable lit les élèves de son établissement');

select * from finish();
rollback;
