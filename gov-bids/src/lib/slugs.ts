/**
 * URL vocabulary. Every public path segment is minted and validated here so a
 * route, its canonical tag and the sitemap can never disagree about what a
 * legal URL looks like.
 */

/** USPS codes the federal sources actually publish, including territories. */
export const US_STATES: Readonly<Record<string, string>> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  AS: 'American Samoa', GU: 'Guam', MP: 'Northern Mariana Islands',
  PR: 'Puerto Rico', VI: 'U.S. Virgin Islands',
} as const

export const US_STATE_CODES: readonly string[] = Object.keys(US_STATES)

/** True only for a code the row data can actually carry. */
export function isStateCode(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(US_STATES, code)
}

export function stateName(code: string): string | null {
  return US_STATES[code] ?? null
}

/** Canonical path segment for a state. Lowercase, so /state/ca is the one URL. */
export function stateSlug(code: string): string {
  return code.toLowerCase()
}

/**
 * A path segment back to a storage code. Returns null when the segment is not a
 * state at all, and the uppercase code otherwise, whatever case arrived. The
 * caller decides whether a non canonical spelling redirects or renders.
 */
export function stateFromSlug(slug: string): string | null {
  const code = slug.trim().toUpperCase()
  return isStateCode(code) ? code : null
}

/**
 * NAICS codes run two to six digits. Matching against the stored naics[] array
 * is exact, so a valid but unused code resolves to zero rows and the route
 * treats that as missing rather than as an empty page.
 */
export function isNaicsCode(code: string): boolean {
  return /^\d{2,6}$/.test(code)
}

export function naicsSlug(code: string): string {
  return code
}

/**
 * Agency name to path segment. One way on purpose.
 *
 * There is no stored slug column, so nothing here ever tries to reverse a slug
 * into a name. Resolution goes the other direction: enumerate the agencies that
 * exist, slug each one, and match. See resolveAgency() in src/lib/db.ts. That
 * makes the round trip lossless by construction, ampersands and commas and
 * accents included.
 */
export function agencySlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Shape check only. Whether the slug names a real agency is a data question. */
export function isAgencySlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
}

/** Opportunity ids are bigint identity values, so digits and nothing else. */
export function parseOpportunityId(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null
  const n = Number(raw)
  return Number.isSafeInteger(n) ? n : null
}
