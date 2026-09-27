/**
 * SAM.gov publishes agency names in caps, and in inverted library order:
 * "AGRICULTURE, DEPARTMENT OF". Shouting reads badly in a results list, and
 * the inversion makes an agency page title nonsense, so both get fixed at
 * ingest rather than at render. Storing the clean value also means the agency
 * slug and the page heading agree.
 */

/** Tokens that stay uppercase because lowercasing them would be wrong. */
const ACRONYMS = new Set([
  'US', 'USA', 'USDA', 'DOD', 'DOE', 'DOI', 'DOJ', 'DOT', 'DHS', 'HHS', 'HUD',
  'VA', 'EPA', 'FAA', 'FBI', 'FDA', 'FEMA', 'GSA', 'IRS', 'NASA', 'NIH', 'NOAA',
  'NSF', 'SBA', 'SEC', 'TSA', 'USAF', 'USMC', 'USN', 'USCG', 'USGS', 'ATF',
  'CDC', 'CIA', 'DEA', 'DLA', 'NGA', 'NRC', 'OSHA', 'TVA', 'USAID', 'CHP',
  'IT', 'HVAC', 'RFP', 'RFQ', 'IFB',
])

/** Small words that stay lowercase unless they lead. */
const MINOR = new Set(['of', 'the', 'and', 'for', 'in', 'on', 'at', 'to', 'a', 'an'])

function titleCaseWord(word: string, isFirst: boolean): string {
  const bare = word.replace(/[^A-Za-z]/g, '')
  if (bare && ACRONYMS.has(bare.toUpperCase())) return word.toUpperCase()

  const lower = word.toLowerCase()
  if (!isFirst && MINOR.has(lower)) return lower

  // Office codes we have no list for (ARS, AFM, APD) come out title cased and
  // look slightly off. Keeping short tokens uppercase to fix that turned
  // "BUREAU OF LAND MANAGEMENT" into "Bureau of LAND Management", so the
  // office-code cosmetics lose to correctness on the names people read.

  // Hyphenated and slashed compounds capitalize on both sides.
  return lower.replace(/(^|[-/])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase())
}

/**
 * Normalize an agency or office name for display and slugging.
 *
 * Only reshapes names that arrive shouting. A name already in mixed case is
 * left exactly as the source published it, because that source took the
 * trouble to capitalize it and probably knows better than this function does.
 */
export function normalizeAgencyName(raw: string | null | undefined): string | null {
  const name = raw?.trim()
  if (!name) return null

  const hasLower = /[a-z]/.test(name)
  if (hasLower) return name

  // "AGRICULTURE, DEPARTMENT OF" reads as "Department of Agriculture", and
  // "INTERIOR, DEPARTMENT OF THE" as "Department of the Interior".
  const inverted =
    /^(.+),\s*(DEPARTMENT|DEPT|OFFICE|BUREAU|AGENCY|ADMINISTRATION|COMMISSION)\s+OF(\s+THE)?\s*$/i.exec(name)
  const ordered = inverted
    ? `${inverted[2]} of ${inverted[3] ? 'the ' : ''}${inverted[1]}`
    : name

  return ordered
    .split(/\s+/)
    .map((w, i) => titleCaseWord(w, i === 0))
    .join(' ')
}
