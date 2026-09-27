-- One grouped count per facet value, for the SEO layer.
--
-- The facet pages (/state/[state], /naics/[code], /agency/[slug]), their
-- generateStaticParams and src/app/sitemap.ts all need "how many open rows
-- carry this value", and the PostgREST client cannot GROUP BY. Counting in
-- JavaScript would mean reading the whole table to build a sitemap, which is
-- exactly what this exists to avoid.
--
-- Open rows only. The facet pages are a view of what is currently biddable;
-- closed solicitations keep their own /opportunity/[id] URL forever.
--
-- Read by listFacets() in src/lib/db.ts. Until this is applied, that function
-- publishes no facet URLs and every facet page returns 404, on purpose: fixture
-- facets served against a live table would put URLs in the sitemap that 404.
--
-- Runs as the caller so the existing public read policy applies. search_path is
-- pinned because an unpinned one is resolvable by the caller.
--
-- Once the table reaches the millions this should become a materialized view
-- refreshed at the end of each ingest run rather than an aggregate over the
-- base table.
create or replace function public.facet_counts()
returns table (kind text, value text, count bigint, last_modified timestamptz)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select 'state'::text, o.state, count(*), max(o.last_seen_at)
  from public.opportunities o
  where o.status = 'open' and o.state is not null and o.state <> ''
  group by o.state
  union all
  select 'naics'::text, n, count(*), max(o.last_seen_at)
  from public.opportunities o, unnest(o.naics) as n
  where o.status = 'open'
  group by n
  union all
  select 'agency'::text, o.agency, count(*), max(o.last_seen_at)
  from public.opportunities o
  where o.status = 'open' and o.agency is not null and o.agency <> ''
  group by o.agency;
$$;

grant execute on function public.facet_counts() to anon, authenticated;
