import { createReadStream } from 'node:fs'
import { unlink, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createWriteStream } from 'node:fs'
import { parse } from 'csv-parse'
import type { Adapter, RunContext } from './types'
import type { NormalizedOpportunity } from '@/lib/types'
import { normalizeAgencyName } from '@/lib/normalize'

const CSV_URL =
  'https://sam.gov/api/prod/fileextractservices/v1/api/download/Contract%20Opportunities/datagov/ContractOpportunitiesFullCSV.csv?privacy=Public'

/**
 * SAM.gov's public API key is capped near ten requests per day, which makes it
 * useless for ingest. The bulk CSV has no key and no cap, so we take that.
 */
export const samAdapter: Adapter = {
  key: 'sam',
  label: 'SAM.gov federal contract opportunities',
  strategy: 'http',
  minDelayMs: 0,
  minExpectedRows: 10_000,

  async *fetch(ctx: RunContext): AsyncIterable<NormalizedOpportunity> {
    const path = join(tmpdir(), `sam-${Date.now()}.csv`)
    ctx.log(`downloading bulk CSV to ${path}`)

    const res = await fetch(CSV_URL, { redirect: 'follow' })
    if (!res.ok || !res.body) {
      throw new Error(`SAM CSV download failed: ${res.status} ${res.statusText}`)
    }
    await pipeline(Readable.fromWeb(res.body as never), createWriteStream(path))
    ctx.log(`downloaded ${((await stat(path)).size / 1e6).toFixed(1)} MB`)

    try {
      const parser = createReadStream(path).pipe(
        parse({ columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true }),
      )

      for await (const row of parser as AsyncIterable<Record<string, string>>) {
        const id = row['NoticeId']?.trim()
        const title = row['Title']?.trim()
        if (!id || !title) continue

        const posted = parseDate(row['PostedDate'])
        if (ctx.since && posted && posted < ctx.since) continue

        yield {
          source: 'sam',
          sourceId: id,
          title,
          description: nz(row['Description']),
          agency: normalizeAgencyName(row['Department/Ind.Agency']),
          subAgency: normalizeAgencyName(row['Sub-Tier']),
          office: normalizeAgencyName(row['Office']),
          noticeType: nz(row['Type']),
          naics: nz(row['NaicsCode']) ? [row['NaicsCode'].trim()] : [],
          psc: nz(row['ClassificationCode']),
          setAside: setAside(row['SetASide']),
          // Place of performance, not the contracting office. This is the field
          // a vendor means when they ask for California work.
          state: nz(row['PopState']) ?? nz(row['State']),
          city: nz(row['PopCity']) ?? nz(row['City']),
          postedAt: posted?.toISOString() ?? null,
          dueAt: parseDate(row['ResponseDeadLine'])?.toISOString() ?? null,
          awardAmount: parseMoney(row['Award$']),
          sourceUrl: nz(row['Link']),
          raw: { solicitationNumber: nz(row['Sol#']), archiveDate: nz(row['ArchiveDate']), active: nz(row['Active']) },
        }
      }
    } finally {
      await unlink(path).catch(() => {})
    }
  },
}

function nz(v: string | undefined): string | null {
  const t = v?.trim()
  return t ? t : null
}

/**
 * SAM sends PostedDate as a bare "2026-09-08" and ResponseDeadLine as a full
 * timestamp with an offset.
 *
 * A bare date parses as UTC midnight, which is 5pm the previous day in Pacific,
 * so every posting rendered a day early and "posted today" was never true.
 * Bare dates are therefore read as Pacific, which is the clock this site
 * publishes in. Timestamps that carry their own offset are left alone.
 */
function parseDate(v: string | undefined): Date | null {
  const t = v?.trim()
  if (!t) return null
  const bareDate = /^\d{4}-\d{2}-\d{2}$/.test(t)
  const d = new Date(bareDate ? `${t}T00:00:00-07:00` : t)
  return Number.isNaN(d.getTime()) ? null : d
}

function parseMoney(v: string | undefined): number | null {
  const t = v?.replace(/[$,]/g, '').trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/**
 * SAM writes "No Set aside used" rather than leaving the column empty. That is
 * the absence of a set aside, so it must not render as a qualifying fact.
 */
function setAside(v: string | undefined): string | null {
  const t = nz(v)
  return t && !/^no set.?aside/i.test(t) ? t : null
}
