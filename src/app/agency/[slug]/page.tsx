import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { findOpportunities, listFacets, resolveAgency } from '@/lib/db'
import { isIndexableFacet, facetMetadata } from '@/lib/indexability'
import { isAgencySlug, US_STATES } from '@/lib/slugs'
import { formatDate } from '@/lib/format'
import { clamp, countPhrase, sentences, sourceList } from '@/lib/seo'
import { FacetPage } from '@/components/facet-page'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const { agencies, states } = await listFacets()
  return agencies.filter((a) => isIndexableFacet(a.count)).map((a) => ({ slug: a.slug }))
}

/**
 * The slug is never reversed. resolveAgency() slugs every known agency name
 * forward and matches, so an ampersand, a comma or an accent in the stored name
 * costs nothing, and the row filter runs on the exact stored string.
 */
async function load(raw: string) {
  if (!isAgencySlug(raw)) notFound()

  const agency = await resolveAgency(raw)
  if (!agency) notFound()

  const result = await findOpportunities({
    agencyExact: agency.value,
    status: 'open',
    perPage: 25,
  })
  if (result.total === 0) notFound()
  return { agency, result }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { agency, result } = await load(slug)

  const soonest = result.rows.find((r) => r.due_at)?.due_at ?? null
  const sources = sourceList(result.rows.map((r) => r.source))
  const states = [
    ...new Set(result.rows.map((r) => r.state).filter((s): s is string => Boolean(s))),
  ]
  // Only claim a location when every row on the page agrees on one.
  const where = states.length === 1 ? (US_STATES[states[0]] ?? states[0]) : null

  return facetMetadata({
    path: `/agency/${agency.slug}`,
    title: clamp(`${agency.value} Bids and Solicitations`, 80),
    description: sentences(
      `${countPhrase(result.total, 'open solicitation', 'open solicitations')} from ${agency.value}`,
      where ? `Work located in ${where}` : null,
      sources ? `Sourced from ${sources}` : null,
      soonest ? `Next deadline ${formatDate(soonest)}` : null,
    ),
    total: result.total,
    lastModified: result.rows[0]?.last_seen_at,
  })
}

export default async function AgencyPage({ params }: Props) {
  const { slug } = await params
  const { agency, result } = await load(slug)
  const { agencies, states } = await listFacets()

  return (
    <FacetPage
      title={`${agency.value} bids and contracts`}
      result={result}
      filters={{
        values: { agency: agency.value, status: 'open' },
        states,
        omit: ['agency'],
        clearHref: `/agency/${agency.slug}`,
      }}
      hrefFor={(n) => (n > 1 ? `/?agency=${encodeURIComponent(agency.value)}&page=${n}` : `/agency/${agency.slug}`)}
      related={{
        heading: 'Other agencies',
        links: agencies
          .filter((a) => a.slug !== agency.slug)
          .slice(0, 24)
          .map((a) => ({ label: a.value, href: `/agency/${a.slug}`, count: a.count })),
      }}
    />
  )
}
