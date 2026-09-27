import { daysUntil } from './format'
import type { OpportunityRow } from './types'

export type DeadlineTone = 'now' | 'soon' | 'clear' | 'quiet'

export interface Deadline {
  label: string
  tone: DeadlineTone
  at: string | null
}

/**
 * The one decision the site exists to support: is this worth opening today.
 *
 * Shared by the results card and the detail page. When the detail page had its
 * own version it disagreed with the card that linked to it, collapsing the two
 * urgency tiers into one and showing nothing at all past seven days, on the
 * page where the bid decision actually happens.
 *
 * daysUntil() counts Pacific calendar days rather than rounding elapsed time,
 * because rounding up on a bid deadline tells a contractor they have more time
 * than they have.
 *
 * Anything already marked closed is trusted over the arithmetic, because
 * ingest lag can leave a stale row looking live.
 */
export function readDeadline(row: OpportunityRow): Deadline {
  if (row.status === 'closed') return { label: 'Closed', tone: 'quiet', at: row.due_at }
  if (!row.due_at) return { label: 'No closing date', tone: 'quiet', at: null }
  if (Date.parse(row.due_at) <= Date.now()) {
    return { label: 'Past due', tone: 'quiet', at: row.due_at }
  }

  const days = daysUntil(row.due_at) ?? 0
  if (days <= 0) return { label: 'Due today', tone: 'now', at: row.due_at }
  if (days === 1) return { label: 'Due tomorrow', tone: 'now', at: row.due_at }
  if (days === 2) return { label: '2 days left', tone: 'now', at: row.due_at }
  if (days <= 7) return { label: `${days} days left`, tone: 'soon', at: row.due_at }
  return { label: `${days} days left`, tone: 'clear', at: row.due_at }
}

/** Colour is never the only signal: the label already says "Due today". */
export const TONE_TEXT: Record<DeadlineTone, string> = {
  now: 'text-due-now',
  soon: 'text-due-soon',
  clear: 'text-ink',
  quiet: 'text-muted',
}

/**
 * Shape carries the tier alongside hue, because due-now and due-soon are
 * luminance-identical and merge into one stripe under deuteranopia. Filled
 * against hollow survives that; two reds do not. quiet was bg-hairline, which
 * sits at 1.5:1 and simply does not render on a list of closed bids.
 */
export const TONE_DOT: Record<DeadlineTone, string> = {
  now: 'size-2.5 bg-due-now',
  soon: 'size-2.5 border-2 border-due-soon',
  clear: 'size-2 bg-strong',
  quiet: 'size-2 border border-strong',
}
