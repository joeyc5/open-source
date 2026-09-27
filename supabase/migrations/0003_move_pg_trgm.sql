-- An extension in the public schema is reachable by anon through PostgREST.
-- The trigram index on agency keeps working from the extensions schema.
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
