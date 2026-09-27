import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/site'
import { sitemapChunkIds } from '@/lib/sitemap-plan'

/**
 * Everything is public and free, so everything is crawlable.
 *
 * The sitemap list is generated from the same chunk plan the sitemaps
 * themselves use, because generateSitemaps publishes /sitemap/[id].xml with no
 * /sitemap.xml index above it. robots.txt is the index.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const ids = await sitemapChunkIds()

  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: ids.map((id) => absoluteUrl(`/sitemap/${id}.xml`)),
    host: absoluteUrl('/').replace(/\/$/, ''),
  }
}
