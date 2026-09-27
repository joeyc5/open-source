import type { SupabaseClient } from '@supabase/supabase-js'
import type { OpportunityRow } from './types'

export interface SearchParams {
  q?: string
  state?: string
  source?: string
  /** Substring match. What a free text agency filter in the UI uses. */
  agency?: string
  /** Exact match. What the /agency/[slug] facet uses once a slug resolves. */
  agencyExact?: string
  naics?: string
  /** Substring match against the set aside label, e.g. "Small Business". */
  setAside?: string
  /** Only bids that are set aside for someone, whichever programme. */
  setAsideAny?: boolean
  /** Closing within this many days. Excludes bids with no closing date. */
  dueWithinDays?: number
  /** Posted in the last this many days. */
  postedWithinDays?: number
  status?: 'open' | 'closed' | 'all'
  page?: number
  perPage?: number
}

export interface SearchResult {
  rows: OpportunityRow[]
  total: number
  page: number
  perPage: number
}

const MAX_PER_PAGE = 100

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

const PACIFIC_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Start of the Pacific day, n days back.
 *
 * Pacific because that is the clock the whole site publishes in. Cutting at
 * UTC midnight made "Posted today" read zero all evening, since 8pm Pacific is
 * already tomorrow in UTC and the day's own postings fell outside the window.
 */
function startOfDayDaysAgo(days: number): string {
  const day = PACIFIC_DAY.format(new Date(Date.now() - days * 86_400_000))
  // Pacific midnight is 07:00 or 08:00 UTC. The earlier bound is the safe one:
  // it can only include an extra hour, never exclude a real posting.
  return new Date(`${day}T00:00:00-07:00`).toISOString()
}

/** The windows the filter offers. Anything else in the URL is ignored. */
export const DUE_WINDOWS: Record<string, { label: string; days: number }> = {
  '7': { label: 'Closing in 7 days', days: 7 },
  '14': { label: 'Closing in 14 days', days: 14 },
  '30': { label: 'Closing in 30 days', days: 30 },
}

export const POSTED_WINDOWS: Record<string, { label: string; days: number }> = {
  '1': { label: 'Posted today', days: 1 },
  '7': { label: 'Posted this week', days: 7 },
  '30': { label: 'Posted this month', days: 30 },
}

/**
 * The single entry point for reading opportunities.
 *
 * Postgres full text search carries v1. Faceted counts across state, NAICS,
 * agency and date degrade once the table reaches millions of rows, and this
 * function is where a different engine gets swapped in without touching any
 * caller.
 */
export async function searchOpportunities(
  db: SupabaseClient,
  params: SearchParams,
): Promise<SearchResult> {
  const page = Math.max(1, params.page ?? 1)
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, params.perPage ?? 25))
  const from = (page - 1) * perPage

  let query = db.from('opportunities').select('*', { count: 'exact' })

  if (params.q?.trim()) {
    query = query.textSearch('search_vector', params.q.trim(), { type: 'websearch' })
  }
  if (params.state) query = query.eq('state', params.state.toUpperCase())
  if (params.source) query = query.eq('source', params.source)
  if (params.agency) query = query.ilike('agency', `%${params.agency}%`)
  if (params.agencyExact) query = query.eq('agency', params.agencyExact)
  if (params.naics) query = query.contains('naics', [params.naics])
  if (params.setAside) query = query.ilike('set_aside', `%${params.setAside}%`)
  if (params.setAsideAny) query = query.not('set_aside', 'is', null)

  if (params.dueWithinDays != null) {
    // Bounded at both ends. Without the lower bound this would sweep in every
    // expired row the moment one slips past the expiry pass.
    query = query
      .gte('due_at', new Date().toISOString())
      .lte('due_at', daysFromNow(params.dueWithinDays))
  }
  if (params.postedWithinDays != null) {
    // Calendar days, not a rolling window. Sources publish posted_at at
    // midnight, so a rolling 24 hours excludes everything posted today and
    // "Posted today" would always read zero.
    query = query.gte('posted_at', startOfDayDaysAgo(params.postedWithinDays - 1))
  }

  const status = params.status ?? 'open'
  if (status !== 'all') query = query.eq('status', status)

  // Open bids sort by soonest deadline, because that is the decision a vendor
  // is making. Closed bids sort by most recent, because that is a record.
  query =
    status === 'closed'
      ? query.order('posted_at', { ascending: false, nullsFirst: false })
      : query.order('due_at', { ascending: true, nullsFirst: false })

  const { data, error, count } = await query.range(from, from + perPage - 1)
  if (error) throw new Error(`search failed: ${error.message}`)

  return { rows: (data ?? []) as OpportunityRow[], total: count ?? 0, page, perPage }
}

export async function getOpportunity(
  db: SupabaseClient,
  id: number,
): Promise<OpportunityRow | null> {
  const { data, error } = await db.from('opportunities').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`lookup failed: ${error.message}`)
  return (data as OpportunityRow) ?? null
}

/**
 * Facet pages only earn an indexable URL above this many results. Below it they
 * are thin content, and at this URL volume they would eat the crawl budget.
 */
export const MIN_INDEXABLE_RESULTS = 5
