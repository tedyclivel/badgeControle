begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(3);

select throws_ok(
  $$
    insert into public.parent_students (school_id, parent_id, student_id)
    values (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000011',
      '00000000-0000-4000-8000-000000000115'
    )
  $$,
  '23514',
  'Le rattachement exige un profil parent actif',
  'un responsable ne peut pas être rattaché comme parent'
);

select throws_ok(
  $$
    insert into public.time_windows (
      school_id, itinerary_id, checkpoint_id, position, starts_at, ends_at, weekdays
    )
    values (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000301',
      '00000000-0000-4000-8000-000000000201',
      3,
      time '08:00',
      time '08:30',
      array[1, 1]::smallint[]
    )
  $$,
  '23514',
  'new row for relation "time_windows" violates check constraint "time_windows_weekdays_unique"',
  'une fenêtre ne peut pas contenir deux fois le même jour'
);

select throws_ok(
  $$
    insert into public.itineraries (
      school_id, student_id, valid_from, valid_until, active
    )
    values (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000111',
      date '2027-01-01',
      date '2027-01-31',
      true
    )
  $$,
  '23P01',
  'conflicting key value violates exclusion constraint "itineraries_active_dates_do_not_overlap"',
  'deux itinéraires actifs d’un élève ne peuvent pas se chevaucher'
);

select * from finish();

rollback;
