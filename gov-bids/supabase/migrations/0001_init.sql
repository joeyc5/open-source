-- gov-bids initial schema

-- Created here, relocated to the extensions schema in 0003.
create extension if not exists pg_trgm;

create type opportunity_status as enum ('open', 'closed');

create table opportunities (
  id             bigint generated always as identity primary key,
  source         text not null,
  source_id      text not null,
  title          text not null,
  description    text,
  agency         text,
  sub_agency     text,
  office         text,
  notice_type    text,
  naics          text[] not null default '{}',
  psc            text,
  set_aside      text,
  state          text,
  city           text,
  posted_at      timestamptz,
  due_at         timestamptz,
  award_amount   numeric,
  source_url     text,
  raw            jsonb not null default '{}'::jsonb,
  status         opportunity_status not null default 'open',
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  search_vector  tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(agency, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored,
  constraint opportunities_source_id_key unique (source, source_id)
);

create index opportunities_search_idx    on opportunities using gin (search_vector);
create index opportunities_naics_idx     on opportunities using gin (naics);
create index opportunities_state_idx     on opportunities (state) where state is not null;
create index opportunities_posted_idx    on opportunities (posted_at desc nulls last);
create index opportunities_due_idx       on opportunities (due_at) where status = 'open';
create index opportunities_status_idx    on opportunities (status);
create index opportunities_source_idx    on opportunities (source);
create index opportunities_agency_trgm   on opportunities using gin (agency gin_trgm_ops);

-- Every ingest attempt is logged. With a dozen scrapers, silent breakage is
-- the failure mode that matters, so a run that sees zero rows is a failure.
create table ingest_runs (
  id            bigint generated always as identity primary key,
  source        text not null,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  rows_seen     integer not null default 0,
  rows_upserted integer not null default 0,
  status        text not null default 'running',  -- running | success | failed
  error         text
);

create index ingest_runs_source_idx on ingest_runs (source, started_at desc);

-- Public site, anonymous reads. Writes happen only through the service role,
-- which bypasses RLS, so no write policy exists here by design.
alter table opportunities enable row level security;
alter table ingest_runs   enable row level security;

create policy opportunities_public_read on opportunities for select to anon, authenticated using (true);
create policy ingest_runs_public_read   on ingest_runs   for select to anon, authenticated using (true);

grant usage on schema public to anon, authenticated;
grant select on opportunities, ingest_runs to anon, authenticated;
