-- Supabase grants ALL on public tables to anon and authenticated by default.
-- RLS blocks the writes today because only SELECT policies exist, but that
-- leaves a public write path one bad policy away. Take the grants back so the
-- privilege layer and the policy layer agree.

revoke all on opportunities from anon, authenticated;
revoke all on ingest_runs   from anon, authenticated;

grant select on opportunities to anon, authenticated;
grant select on ingest_runs   to anon, authenticated;

-- Future tables in this schema inherit the same posture.
alter default privileges in schema public revoke all on tables from anon, authenticated;
