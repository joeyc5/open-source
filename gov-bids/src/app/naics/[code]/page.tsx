import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { findOpportunities, listFacets } from '@/lib/db'
import { isIndexableFacet, facetMetadata } from '@/lib/indexability'
import { isNaicsCode } from '@/lib/slugs'
import { formatDate } from '@/lib/format'
import { countPhrase, sentences, sourceList } from '@/lib/seo'
import { FacetPage } from '@/components/facet-page'

type Props = {
  params: Promise<{ code: string }>
}

export async function generateStaticParams() {
  const { naics, states } = await listFacets()
  return naics.filter((n) => isIndexableFacet(n.count)).map((n) => ({ code: n.slug }))
}

/**
 * NAICS matching is exact against the stored naics[] array, so a well formed
 * code that nothing is classified under is a missing page, not an empty one.
 */
async function load(raw: string) {
  if (!isNaicsCode(raw)) notFound()

  const result = await findOpportunities({ naics: raw, status: 'open', perPage: 25 })
  if (result.total === 0) notFound()
  return { code: raw, result }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const { result } = await load(code)

  const soonest = result.rows.find((r) => r.due_at)?.due_at ?? null
  const sources = sourceList(result.rows.map((r) => r.source))
  const agencies = [...new Set(result.rows.map((r) => r.agency).filter(Boolean))]

  return facetMetadata({
    path: `/naics/${code}`,
    title: `NAICS ${code} Government Contract Opportunities`,
    description: sentences(
      `${countPhrase(result.total, 'open solicitation', 'open solicitations')} classified under NAICS code ${code}`,
      agencies.length === 1 ? `All from ${agencies[0]}` : null,
      sources ? `Sourced from ${sources}` : null,
      soonest ? `Next deadline ${formatDate(soonest)}` : null,
    ),
    total: result.total,
    lastModified: result.rows[0]?.last_seen_at,
  })
}

export default async function NaicsPage({ params }: Props) {
  const { code } = await params
  const { result } = await load(code)
  const { naics, states } = await listFacets()

  return (
    <FacetPage
      title={`NAICS ${code} government bids`}
      result={result}
      filters={{
        values: { naics: code, status: 'open' },
        states,
        omit: ['naics'],
        clearHref: `/naics/${code}`,
      }}
      hrefFor={(n) => (n > 1 ? `/?naics=${code}&page=${n}` : `/naics/${code}`)}
      related={{
        heading: 'Other classifications',
        links: naics
          .filter((n) => n.value !== code)
          .slice(0, 24)
          .map((n) => ({ label: `NAICS ${n.value}`, href: `/naics/${n.slug}`, count: n.count })),
      }}
    />
  )
}
