import type { MetadataRoute } from 'next'
import { listFacets, opportunitySitemapRange } from '@/lib/db'
import { isIndexableFacet } from '@/lib/indexability'
import { absoluteUrl } from '@/lib/site'
import {
  FACET_SITEMAP_ID,
  opportunityIdRange,
  sitemapChunkIds,
} from '@/lib/sitemap-plan'

/**
 * Chunked sitemaps, served at /sitemap/0.xml, /sitemap/1.xml and so on.
 *
 * Exporting generateSitemaps moves this route to /sitemap/[id].xml, which means
 * /sitemap.xml itself does not exist. robots.ts lists every chunk instead, which
 * is how a crawler finds them.
 *
 * Only indexable URLs go in. A facet below MIN_INDEXABLE_RESULTS returns
 * noindex, and asking a crawler to fetch a page in order to be told not to index
 * it is how a site this size burns its crawl budget.
 */
export async function generateSitemaps(): Promise<Array<{ id: number }>> {
  const ids = await sitemapChunkIds()
  return ids.map((id) => ({ id }))
}

export default async function sitemap(props: {
  id: Promise<string>
}): Promise<MetadataRoute.Sitemap> {
  const chunkId = Number(await props.id)

  if (chunkId === FACET_SITEMAP_ID) return facetSitemap()

  const { startId, endId } = opportunityIdRange(chunkId)
  const entries = await opportunitySitemapRange(startId, endId)

  return entries.map((entry) => ({
    url: absoluteUrl(`/opportunity/${entry.id}`),
    lastModified: entry.lastModified,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))
}

async function facetSitemap(): Promise<MetadataRoute.Sitemap> {
  const { states, naics, agencies } = await listFacets()

  const facets = [
    ...states.map((f) => ({ ...f, path: `/state/${f.slug}`, priority: 0.9 })),
    ...naics.map((f) => ({ ...f, path: `/naics/${f.slug}`, priority: 0.6 })),
    ...agencies.map((f) => ({ ...f, path: `/agency/${f.slug}`, priority: 0.6 })),
  ]

  return [
    {
      url: absoluteUrl('/'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...facets
      .filter((f) => isIndexableFacet(f.count))
      .map((f) => ({
        url: absoluteUrl(f.path),
        lastModified: f.lastModified,
        changeFrequency: 'daily' as const,
        priority: f.priority,
      })),
  ]
}
