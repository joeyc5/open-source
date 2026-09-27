import type { Metadata } from 'next'
import { MIN_INDEXABLE_RESULTS } from './search'
import { SITE_NAME, absoluteUrl } from './site'

/**
 * ---------------------------------------------------------------------------
 * The thin content guard.
 *
 * A facet page is a real page for a person no matter how few results it has.
 * It is only a real page for a crawler once it carries enough of them. Below
 * MIN_INDEXABLE_RESULTS the page still renders, still links onward, and still
 * returns 200. It just says noindex.
 *
 * follow stays on either way. A thin state page is still the shortest path a
 * crawler has to the opportunity detail pages underneath it, which are the
 * pages that earn the traffic.
 *
 * Every facet route builds its metadata through facetMetadata(), so the rule
 * exists once. Nothing else in the codebase decides indexability.
 * ---------------------------------------------------------------------------
 */
export function isIndexableFacet(total: number): boolean {
  return total >= MIN_INDEXABLE_RESULTS
}

export function facetRobots(total: number): NonNullable<Metadata['robots']> {
  return isIndexableFacet(total)
    ? {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
      }
    : {
        index: false,
        follow: true,
        googleBot: { index: false, follow: true },
      }
}

export interface FacetMetadataInput {
  /** Site relative path, already canonical. */
  path: string
  title: string
  description: string
  /** Open rows behind the page. The only input the guard reads. */
  total: number
  /** Newest last_seen_at in the group. */
  lastModified?: string
}

/** Full metadata for a facet page, indexability included. */
export function facetMetadata({
  path,
  title,
  description,
  total,
  lastModified,
}: FacetMetadataInput): Metadata {
  const url = absoluteUrl(path)
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: facetRobots(total),
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      title,
      description,
      ...(lastModified ? { modifiedTime: lastModified } : {}),
    },
    twitter: { card: 'summary', title, description },
  }
}
