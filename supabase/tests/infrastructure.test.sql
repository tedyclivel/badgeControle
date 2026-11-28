BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap
WITH SCHEMA extensions;

SET LOCAL search_path = public, extensions;

SELECT plan(2);

SELECT has_schema(
    'auth',
    'Authentication schema exists'
);

SELECT has_table(
    'auth',
    'users',
    'Authentication users table exists'
);

SELECT * FROM finish();

ROLLBACK;
