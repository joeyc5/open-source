import type { Adapter, RunContext } from './types'
import { sleep } from './types'
import type { NormalizedOpportunity } from '@/lib/types'

const ENDPOINT = 'https://api.grants.gov/v1/api/search2'
const PAGE_SIZE = 100

interface GrantsHit {
  id: string
  number?: string
  title?: string
  agency?: string
  agencyCode?: string
  openDate?: string
  closeDate?: string
  oppStatus?: string
  docType?: string
  cfdaList?: string[]
}

/** Grants.gov search2 takes an unauthenticated POST and pages cleanly. */
export const grantsAdapter: Adapter = {
  key: 'grants',
  label: 'Grants.gov federal funding opportunities',
  strategy: 'http',
  minDelayMs: 250,
  minExpectedRows: 200,

  async *fetch(ctx: RunContext): AsyncIterable<NormalizedOpportunity> {
    let start = 0
    let total = Infinity

    while (start < total) {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: PAGE_SIZE,
          startRecordNum: start,
          oppStatuses: 'forecasted|posted|closed',
        }),
      })
      if (!res.ok) throw new Error(`Grants.gov search2 failed: ${res.status} ${res.statusText}`)

      const body = (await res.json()) as { data?: { hitCount?: number; oppHits?: GrantsHit[] } }
      const hits = body.data?.oppHits ?? []
      total = body.data?.hitCount ?? 0
      if (hits.length === 0) break

      ctx.log(`page at ${start} of ${total}`)

      for (const h of hits) {
        if (!h.id || !h.title) continue
        yield {
          source: 'grants',
          sourceId: h.id,
          title: h.title,
          agency: h.agency ?? null,
          noticeType: h.docType ?? null,
          // Federal grants are nationwide, so leaving state null is correct
          // rather than unknown.
          state: null,
          postedAt: parseUsDate(h.openDate),
          dueAt: parseUsDate(h.closeDate),
          sourceUrl: `https://grants.gov/search-results-detail/${h.id}`,
          raw: { number: h.number, agencyCode: h.agencyCode, oppStatus: h.oppStatus, cfda: h.cfdaList },
        }
      }

      start += hits.length
      await sleep(this.minDelayMs)
    }
  },
}

/** Grants.gov returns MM/DD/YYYY. */
function parseUsDate(v: string | undefined): string | null {
  if (!v) return null
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v.trim())
  if (!m) return null
  return new Date(Date.UTC(+m[3], +m[1] - 1, +m[2])).toISOString()
}
