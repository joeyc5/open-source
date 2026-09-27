import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { publicClient, readReadKey, readUrl } from './supabase'
import {
  searchOpportunities,
  getOpportunity,
  type SearchParams,
  type SearchResult,
} from './search'
import type { OpportunityRow } from './types'
import { fixtureOpportunities } from './fixtures'
import { agencySlug, isStateCode } from './slugs'

/*
 * ---------------------------------------------------------------------------
 * THE FIXTURE FALLBACK LIVES HERE AND NOWHERE ELSE.
 *
 * No Supabase project is provisioned yet. Every read in this file tries the
 * database first and falls back to src/lib/fixtures.ts when there is no
 * connection or the query fails, so `next build` never dies on a missing
 * backend. Nothing outside this file knows the fallback exists.
 *
 * To delete it once the database is live: remove liveOnly(), the `fallback`
 * argument threading, and the `fixture*` functions at the bottom. Every
 * exported function keeps its signature.
 * ---------------------------------------------------------------------------
 */

/**
 * Null when the site has no database configured.
 *
 * On Vercel this throws instead. The fixture fallback exists so a local build
 * works without credentials; serving eleven invented bids from a real URL, with
 * a sitemap advertising rows that 404, is a different thing entirely and is
 * never what anyone wanted.
 */
function client(): SupabaseClient | null {
  if (!readUrl() || !readReadKey()) {
    if (process.env.VERCEL) {
      throw new Error(
        'No Supabase credentials on a Vercel deployment. Set SUPABASE_URL and ' +
          'SUPABASE_PUBLISHABLE_KEY for this environment. Refusing to serve fixtures.',
      )
    }
    return null
  }
  try {
    return publicClient()
  } catch {
    return null
  }
}

let warned = false

function noDatabase(): boolean {
  const absent = client() === null
  if (absent && !warned) {
    warned = true
    console.warn('[gov-bids] no Supabase connection, serving fixtures')
  }
  return absent
}

/**
 * Reads that render a page for a person. If the database is unreachable, stale
 * fixture content beats a 500, so any failure degrades to fixtures.
 */
async function withFixtures<T>(
  live: (db: SupabaseClient) => Promise<T>,
  fixture: () => T,
  what: string,
): Promise<T> {
  const db = client()
  if (!db) {
    noDatabase()
    return fixture()
  }
  try {
    return await live(db)
  } catch (err) {
    console.warn(`[gov-bids] ${what} fell back to fixtures:`, (err as Error).message)
    return fixture()
  }
}

/**
 * Reads that mint URLs: sitemap entries, prerendered params, the agency slug
 * lookup.
 *
 * These follow a stricter rule. Fixtures answer only when there is no database
 * at all. A database that is present but cannot answer returns `empty` instead,
 * because fixture URLs published against a live table are URLs that 404, and a
 * sitemap full of 404s is worse than a sitemap that is briefly short.
 */
async function withoutFiction<T>(
  live: (db: SupabaseClient) => Promise<T>,
  fixture: () => T,
  empty: T,
  what: string,
): Promise<T> {
  const db = client()
  if (!db) {
    noDatabase()
    return fixture()
  }
  try {
    return await live(db)
  } catch (err) {
    console.error(`[gov-bids] ${what} failed, publishing no URLs:`, (err as Error).message)
    return empty
  }
}

// --- reads ------------------------------------------------------------------

/** One opportunity. Cached so generateMetadata and the page share a fetch. */
export const findOpportunity = cache(async (id: number): Promise<OpportunityRow | null> => {
  return withFixtures(
    (db) => getOpportunity(db, id),
    () => fixtureOpportunities.find((row) => row.id === id) ?? null,
    `opportunity ${id}`,
  )
})

/** A page of results. Cached so a facet page counts once, not twice. */
export const findOpportunities = cache(async (params: SearchParams): Promise<SearchResult> => {
  return withFixtures(
    (db) => searchOpportunities(db, params),
    () => fixtureSearch(params),
    'search',
  )
})

export interface FacetCount {
  /** The stored value, for querying. */
  value: string
  /** The URL segment. */
  slug: string
  /** Open rows carrying this value. What the indexability guard reads. */
  count: number
  /** Newest last_seen_at in the group, for sitemap lastModified. */
  lastModified: string
}

export interface FacetIndex {
  states: FacetCount[]
  naics: FacetCount[]
  agencies: FacetCount[]
}

const NO_FACETS: FacetIndex = { states: [], naics: [], agencies: [] }

/**
 * Every facet value that has at least one open row, with its count.
 *
 * generateStaticParams, the sitemap and the agency slug lookup all read this,
 * so it is cached per request and per build.
 *
 * REQUIRED BEFORE THE DATABASE GOES LIVE: a Postgres function `facet_counts()`.
 * The Supabase REST client cannot GROUP BY, and scanning the table to count in
 * JavaScript is exactly what a sitemap over hundreds of thousands of rows must
 * not do. It should return one row per facet value, counting OPEN rows only, as
 * (kind, value, count, last_modified) where kind is 'state', 'naics' or
 * 'agency', and naics is unnested from the array.
 *
 * These values mint URLs, so this goes through withoutFiction(): fixture facets
 * served against a live table would put sitemap URLs in front of a crawler that
 * 404, and would 404 every agency page that actually exists.
 */
export const listFacets = cache(async (): Promise<FacetIndex> => {
  return withoutFiction(
    async (db) => {
      const { data, error } = await db.rpc('facet_counts')
      if (error) throw new Error(error.message)
      const rows = (data ?? []) as Array<{
        kind: string
        value: string
        count: number
        last_modified: string
      }>
      const pick = (kind: string, slug: (v: string) => string): FacetCount[] =>
        rows
          .filter((r) => r.kind === kind && r.value)
          .map((r) => ({
            value: r.value,
            slug: slug(r.value),
            count: Number(r.count),
            lastModified: r.last_modified,
          }))
          .filter((f) => f.slug.length > 0)
          .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))
      return {
        states: pick('state', (v) => v.toLowerCase()),
        naics: pick('naics', (v) => v),
        agencies: pick('agency', agencySlug),
      }
    },
    fixtureFacets,
    NO_FACETS,
    'facet_counts()',
  )
})

/**
 * A slug back to the agency name that produced it.
 *
 * Nothing here inverts the slug. The candidate set is enumerated and each name
 * is slugged forward, so the round trip is lossless for any name at all.
 */
export const resolveAgency = cache(async (slug: string): Promise<FacetCount | null> => {
  const { agencies } = await listFacets()
  return agencies.find((a) => a.slug === slug) ?? null
})

/** Highest id in the table. Sizes the sitemap chunk plan without a full count. */
export const maxOpportunityId = cache(async (): Promise<number> => {
  return withoutFiction(
    async (db) => {
      const { data, error } = await db
        .from('opportunities')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return (data as { id: number } | null)?.id ?? 0
    },
    () => fixtureOpportunities.reduce((max, row) => Math.max(max, row.id), 0),
    0,
    'max opportunity id',
  )
})

export interface SitemapEntry {
  id: number
  lastModified: string
}

const PAGE_SIZE = 1000

/**
 * Ids and timestamps for one sitemap chunk, addressed by id range rather than
 * offset so a chunk never scans the rows before it and memory stays bounded to
 * the chunk. Two columns only, never select('*') here.
 */
export async function opportunitySitemapRange(
  startId: number,
  endId: number,
): Promise<SitemapEntry[]> {
  return withoutFiction(
    async (db) => {
      const out: SitemapEntry[] = []
      for (let cursor = startId; cursor <= endId; ) {
        const { data, error } = await db
          .from('opportunities')
          .select('id,last_seen_at')
          .gte('id', cursor)
          .lte('id', endId)
          .order('id', { ascending: true })
          .limit(PAGE_SIZE)
        if (error) throw new Error(error.message)
        const batch = (data ?? []) as Array<{ id: number; last_seen_at: string }>
        if (batch.length === 0) break
        for (const row of batch) out.push({ id: row.id, lastModified: row.last_seen_at })
        cursor = batch[batch.length - 1].id + 1
        if (batch.length < PAGE_SIZE) break
      }
      return out
    },
    () =>
      fixtureOpportunities
        .filter((row) => row.id >= startId && row.id <= endId)
        .map((row) => ({ id: row.id, lastModified: row.last_seen_at }))
        .sort((a, b) => a.id - b.id),
    [],
    `sitemap range ${startId} to ${endId}`,
  )
}

// --- fixture implementations ------------------------------------------------
// Delete everything below when the database is live.

function fixtureSearch(params: SearchParams): SearchResult {
  const page = Math.max(1, params.page ?? 1)
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 25))
  const status = params.status ?? 'open'

  let rows = fixtureOpportunities.slice()
  if (status !== 'all') rows = rows.filter((r) => r.status === status)
  if (params.state) rows = rows.filter((r) => r.state === params.state!.toUpperCase())
  if (params.source) rows = rows.filter((r) => r.source === params.source)
  if (params.agencyExact) rows = rows.filter((r) => r.agency === params.agencyExact)
  if (params.agency) {
    const needle = params.agency.toLowerCase()
    rows = rows.filter((r) => (r.agency ?? '').toLowerCase().includes(needle))
  }
  if (params.naics) rows = rows.filter((r) => r.naics.includes(params.naics!))
  if (params.q?.trim()) {
    const needle = params.q.trim().toLowerCase()
    rows = rows.filter((r) =>
      `${r.title} ${r.agency ?? ''} ${r.description ?? ''}`.toLowerCase().includes(needle),
    )
  }

  rows.sort((a, b) =>
    status === 'closed'
      ? (b.posted_at ?? '').localeCompare(a.posted_at ?? '')
      : (a.due_at ?? '\uffff').localeCompare(b.due_at ?? '\uffff'),
  )

  const from = (page - 1) * perPage
  return { rows: rows.slice(from, from + perPage), total: rows.length, page, perPage }
}

function fixtureFacets(): FacetIndex {
  const open = fixtureOpportunities.filter((r) => r.status === 'open')

  const tally = (
    values: (row: OpportunityRow) => string[],
    slug: (value: string) => string,
  ): FacetCount[] => {
    const byValue = new Map<string, { count: number; lastModified: string }>()
    for (const row of open) {
      for (const value of values(row)) {
        const entry = byValue.get(value) ?? { count: 0, lastModified: row.last_seen_at }
        entry.count += 1
        if (row.last_seen_at > entry.lastModified) entry.lastModified = row.last_seen_at
        byValue.set(value, entry)
      }
    }
    return [...byValue.entries()]
      .map(([value, entry]) => ({ value, slug: slug(value), ...entry }))
      .filter((f) => f.slug.length > 0)
      .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))
  }

  return {
    states: tally(
      (r) => (r.state && isStateCode(r.state) ? [r.state] : []),
      (v) => v.toLowerCase(),
    ),
    naics: tally((r) => r.naics, (v) => v),
    agencies: tally((r) => (r.agency ? [r.agency] : []), agencySlug),
  }
}
