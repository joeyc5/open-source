import { chromium } from 'playwright'
import type { Adapter, RunContext } from './types'
import type { NormalizedOpportunity } from '@/lib/types'

const SEARCH_URL = 'https://caleprocure.ca.gov/pages/Events-BS3/event-search.aspx'
const RESULTS = '#datatable-ready'
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0 Safari/537.36'

/**
 * The California State Contracts Register.
 *
 * Cal eProcure is PeopleSoft behind InFlight NLX middleware, so there is no API
 * and the page ships an empty shell. Once the grid renders it is ordinary DOM,
 * which is what we read. Around 380 open events statewide.
 */
export const calEProcureAdapter: Adapter = {
  key: 'caleprocure',
  label: 'Cal eProcure (California State Contracts Register)',
  strategy: 'headless',
  minDelayMs: 1000,
  minExpectedRows: 50,

  async *fetch(ctx: RunContext): AsyncIterable<NormalizedOpportunity> {
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage({ userAgent: UA })
      ctx.log('loading Cal eProcure event search')
      await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await page.waitForSelector(`${RESULTS} tbody tr`, { timeout: 90_000 })
      await page.waitForTimeout(3000)

      const rows = await page.$$eval(`${RESULTS} tbody tr`, (trs) =>
        trs
          .map((tr) => [...tr.querySelectorAll('td')].map((td) => (td.textContent ?? '').trim()))
          .filter((c) => c.length >= 6 && c[1]),
      )
      ctx.log(`read ${rows.length} rows`)

      for (const [, eventId, title, department, endDate, status] of rows) {
        yield {
          source: 'caleprocure',
          sourceId: eventId,
          title: title || eventId,
          agency: department || null,
          noticeType: 'Solicitation',
          state: 'CA',
          dueAt: parsePacific(endDate),
          sourceUrl: detailUrl(eventId),
          raw: { status, department },
        }
      }
    } finally {
      await browser.close()
    }
  },
}

/**
 * The detail page resolves from the event ID alone. BUSINESS_UNIT appears in
 * the links Cal eProcure generates but PeopleSoft does not require it, which
 * is what makes a stable public URL possible here.
 */
function detailUrl(eventId: string): string {
  const q = new URLSearchParams({
    Page: 'AUC_RESP_INQ_DTL',
    Action: 'U',
    AUC_ID: eventId,
    AUC_ROUND: '1',
    BIDDER_ID: 'BID0000001',
    BIDDER_LOC: '1',
    BIDDER_SETID: 'STATE',
    BIDDER_TYPE: 'B',
  })
  return `https://caleprocure.ca.gov/pages/Events-BS3/event-details.aspx?${q}`
}

/** Cal eProcure renders end dates as "09/08/2026 10:00AM PDT". */
function parsePacific(v: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(v.trim())
  if (!m) return null
  const [, mo, d, y, hRaw, min, ap] = m
  let h = +hRaw % 12
  if (ap.toUpperCase() === 'PM') h += 12
  const offsetHours = /PDT/i.test(v) ? 7 : 8
  return new Date(Date.UTC(+y, +mo - 1, +d, h + offsetHours, +min)).toISOString()
}
