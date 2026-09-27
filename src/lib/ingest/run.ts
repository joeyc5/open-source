import type { SupabaseClient } from '@supabase/supabase-js'
import type { Adapter } from '@/lib/adapters/types'
import type { NormalizedOpportunity } from '@/lib/types'

const BATCH = 500

export interface RunResult {
  source: string
  rowsSeen: number
  rowsUpserted: number
  status: 'success' | 'failed'
  error?: string
  closed: number
}

export async function runAdapter(db: SupabaseClient, adapter: Adapter): Promise<RunResult> {
  const startedAt = new Date().toISOString()
  const log = (msg: string) => console.log(`[${adapter.key}] ${msg}`)

  const { data: run } = await db
    .from('ingest_runs')
    .insert({ source: adapter.key, started_at: startedAt, status: 'running' })
    .select('id')
    .single()

  let seen = 0
  let upserted = 0
  let batch: ReturnType<typeof toRow>[] = []

  const flush = async () => {
    if (batch.length === 0) return
    const { error } = await db.from('opportunities').upsert(batch, { onConflict: 'source,source_id' })
    if (error) throw new Error(`upsert failed: ${error.message}`)
    upserted += batch.length
    batch = []
  }

  try {
    for await (const item of adapter.fetch({ log })) {
      seen++
      batch.push(toRow(item))
      if (batch.length >= BATCH) {
        await flush()
        log(`upserted ${upserted}`)
      }
    }
    await flush()

    // A source that returns almost nothing is broken, not empty. Closing on a
    // broken run would mark every row from that source closed, so skip it.
    let closed = 0
    if (seen >= adapter.minExpectedRows) {
      closed = await closeStale(db, adapter.key, startedAt)
      log(`closed ${closed} stale rows`)
    } else {
      log(`only ${seen} rows, below the ${adapter.minExpectedRows} floor. Skipping the close pass.`)
    }

    // A deadline that has passed is closed, whatever the source still lists.
    // SAM keeps expired notices flagged active until it archives them, which
    // put 9,498 dead bids at the top of every list sorted by soonest deadline.
    // This is derived from stored dates rather than from the fetch, so it is
    // safe to run even when the run above was too thin to trust.
    const expired = await expireOverdue(db, adapter.key)
    if (expired > 0) log(`closed ${expired} rows whose deadline has passed`)
    closed += expired

    await finish(db, run?.id, { rows_seen: seen, rows_upserted: upserted, status: 'success' })
    return { source: adapter.key, rowsSeen: seen, rowsUpserted: upserted, status: 'success', closed }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await finish(db, run?.id, { rows_seen: seen, rows_upserted: upserted, status: 'failed', error: message })
    return { source: adapter.key, rowsSeen: seen, rowsUpserted: upserted, status: 'failed', error: message, closed: 0 }
  }
}

/** Anything this source did not re-report in a healthy run has come down. */
async function closeStale(db: SupabaseClient, source: string, startedAt: string): Promise<number> {
  const { data, error } = await db
    .from('opportunities')
    .update({ status: 'closed' })
    .eq('source', source)
    .eq('status', 'open')
    .lt('last_seen_at', startedAt)
    .select('id')
  if (error) throw new Error(`close pass failed: ${error.message}`)
  return data?.length ?? 0
}

/** Past the closing date is closed, regardless of what the source still says. */
async function expireOverdue(db: SupabaseClient, source: string): Promise<number> {
  const { data, error } = await db
    .from('opportunities')
    .update({ status: 'closed' })
    .eq('source', source)
    .eq('status', 'open')
    .lt('due_at', new Date().toISOString())
    .select('id')
  if (error) throw new Error(`expiry pass failed: ${error.message}`)
  return data?.length ?? 0
}

async function finish(db: SupabaseClient, id: number | undefined, patch: Record<string, unknown>) {
  if (!id) return
  await db.from('ingest_runs').update({ ...patch, finished_at: new Date().toISOString() }).eq('id', id)
}

function toRow(o: NormalizedOpportunity) {
  return {
    source: o.source,
    source_id: o.sourceId,
    title: o.title,
    description: o.description ?? null,
    agency: o.agency ?? null,
    sub_agency: o.subAgency ?? null,
    office: o.office ?? null,
    notice_type: o.noticeType ?? null,
    naics: o.naics ?? [],
    psc: o.psc ?? null,
    set_aside: o.setAside ?? null,
    state: o.state ?? null,
    city: o.city ?? null,
    posted_at: o.postedAt ?? null,
    due_at: o.dueAt ?? null,
    award_amount: o.awardAmount ?? null,
    source_url: o.sourceUrl ?? null,
    raw: o.raw ?? {},
    status: 'open' as const,
    last_seen_at: new Date().toISOString(),
  }
}
