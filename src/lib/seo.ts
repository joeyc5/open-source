import { SOURCE_LABELS } from './format'

/** Trim to a length a search result can show, on a word boundary. */
export function clamp(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  const kept = space > max * 0.6 ? cut.slice(0, space) : cut
  return `${kept.replace(/[\s,.;:]+$/, '')}…`
}

/** "1 open bid" / "24 open bids". Plain count, no rounding, no hedging. */
export function countPhrase(n: number, singular: string, plural: string): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? singular : plural}`
}

/** Joins sentence fragments into one description with no empty gaps. */
export function sentences(...parts: Array<string | null | undefined>): string {
  return parts
    .filter((p): p is string => Boolean(p && p.trim()))
    .map((p) => (/[.!?]$/.test(p.trim()) ? p.trim() : `${p.trim()}.`))
    .join(' ')
}

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source
}

/** "SAM.gov and Grants.gov", "SAM.gov, Grants.gov and Cal eProcure". */
export function sourceList(sources: string[]): string {
  const labels = [...new Set(sources)].map(sourceLabel).sort()
  if (labels.length === 0) return ''
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
}
