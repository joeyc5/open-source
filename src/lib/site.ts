/**
 * Absolute origin for canonical URLs, OpenGraph tags, robots.txt and the
 * sitemaps. Everything that has to emit an absolute URL reads it from here.
 *
 * Set NEXT_PUBLIC_SITE_URL once the domain is chosen. On Vercel the production
 * domain fills in on its own. Locally it is the dev server, which keeps
 * canonicals resolvable instead of pointing at a domain that does not exist.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, '')

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`

  return 'http://localhost:3000'
}

export const SITE_URL = resolveSiteUrl()

export const SITE_NAME = 'Gov Bids'

export const SITE_DESCRIPTION =
  'Search open government contracts, grants and solicitations from SAM.gov, Grants.gov and California state agencies. Free, no account required.'

/** Absolute URL for a site relative path. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
