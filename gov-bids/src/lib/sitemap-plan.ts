import { maxOpportunityId } from './db'

/**
 * Sitemap chunking.
 *
 * Google caps a sitemap at 50,000 URLs and 50 MB uncompressed. 25,000 leaves
 * headroom and keeps each chunk cheap to regenerate.
 *
 * Chunk 0 holds the home page and every facet URL that clears the indexability
 * threshold. That set is bounded by the number of states, NAICS codes and
 * agencies, so it fits in one chunk for a long time.
 *
 * Chunks 1..N hold opportunity detail URLs, addressed by primary key range.
 * Ranges, not OFFSET pagination: chunk 7 reads ids 150001 to 175000 directly,
 * never scanning the 150,000 rows in front of it, and never holding more than
 * one chunk in memory. Deleted or missing ids leave a chunk sparse, which the
 * sitemap format allows. Nothing renumbers when the table grows.
 */
export const URLS_PER_SITEMAP = 25_000

/** Chunk 0 is the facet chunk. Opportunity chunks start at 1. */
export const FACET_SITEMAP_ID = 0

export function opportunityIdRange(chunkId: number): { startId: number; endId: number } {
  const startId = (chunkId - 1) * URLS_PER_SITEMAP + 1
  return { startId, endId: startId + URLS_PER_SITEMAP - 1 }
}

/**
 * Every sitemap id this build will publish. generateSitemaps() and robots.ts
 * both read this, so robots.txt can never advertise a chunk that does not exist
 * or miss one that does.
 */
export async function sitemapChunkIds(): Promise<number[]> {
  const maxId = await maxOpportunityId()
  const opportunityChunks = Math.max(1, Math.ceil(maxId / URLS_PER_SITEMAP))
  return [
    FACET_SITEMAP_ID,
    ...Array.from({ length: opportunityChunks }, (_, i) => i + 1),
  ]
}
