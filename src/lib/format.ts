const DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles',
})
/**
 * Deadlines print in Pacific with the zone named. Without the zone a New York
 * bid due 2:00 PM Eastern reads "11:00 AM" and an East Coast bidder abandons
 * work that is still open. timeZoneName rather than a literal, because real
 * data carries winter deadlines and the offset changes.
 */
const DATETIME = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  timeZone: 'America/Los_Angeles', timeZoneName: 'short',
})

export function formatDate(iso: string | null): string {
  return iso ? DATE.format(new Date(iso)) : ''
}

export function formatDateTime(iso: string | null): string {
  return iso ? DATETIME.format(new Date(iso)) : ''
}

/**
 * Pacific calendar day. Every bid on this site is published and enforced in
 * Pacific time, so that is the day a deadline actually falls on.
 */
const PACIFIC_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Whole Pacific calendar days until the deadline. Negative once it has passed.
 *
 * This counts calendar days rather than rounding elapsed milliseconds. Rounding
 * up told a contractor a bid closing in six hours had "1 day left", the same as
 * one closing tomorrow evening, and turned 17.0 days into 18. On a bid deadline
 * that is the one direction the number must never err in.
 */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const due = Date.parse(PACIFIC_DAY.format(new Date(iso)))
  const today = Date.parse(PACIFIC_DAY.format(new Date()))
  if (Number.isNaN(due) || Number.isNaN(today)) return null
  return Math.round((due - today) / 86_400_000)
}

export function formatMoney(n: number | null): string {
  if (n == null) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n)
}

export const SOURCE_LABELS: Record<string, string> = {
  sam: 'SAM.gov',
  grants: 'Grants.gov',
  caleprocure: 'Cal eProcure',
}

/**
 * The identifier a person would quote back to the agency, or null when the
 * source publishes only an internal key.
 *
 * Decided per source rather than by string length. SAM.gov's 32 character
 * value is a database id wearing a solicitation number's clothes; Grants.gov
 * carries the real funding opportunity number alongside its record id.
 */
export function identifierLabel(row: {
  source: string
  source_id: string
  raw?: Record<string, unknown> | null
}): string | null {
  if (row.source === 'caleprocure') return `Event ${row.source_id}`
  if (row.source === 'grants') {
    const number = typeof row.raw?.number === 'string' ? row.raw.number : null
    return number ? `Opportunity ${number}` : null
  }
  return null
}
