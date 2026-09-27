import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { findOpportunities, listFacets } from '@/lib/db'
import { isIndexableFacet, facetMetadata } from '@/lib/indexability'
import { stateFromSlug, stateName, stateSlug } from '@/lib/slugs'
import { formatDate } from '@/lib/format'
import { countPhrase, sentences, sourceList } from '@/lib/seo'
import { FacetPage } from '@/components/facet-page'

type Props = {
  params: Promise<{ state: string }>
}

/**
 * Prerender only the states we ask a crawler to index. Everything else still
 * renders on demand, it just does not spend build time.
 */
export async function generateStaticParams() {
  const { states } = await listFacets()
  return states.filter((s) => isIndexableFacet(s.count)).map((s) => ({ state: s.slug }))
}

/**
 * One lowercase URL per state. A valid code in the wrong case redirects to the
 * canonical instead of quietly serving the same page at two addresses.
 */
async function load(raw: string) {
  const code = stateFromSlug(raw)
  if (!code) notFound()
  if (raw !== stateSlug(code)) permanentRedirect(`/state/${stateSlug(code)}`)

  const result = await findOpportunities({ state: code, status: 'open', perPage: 25 })
  if (result.total === 0) notFound()
  return { code, name: stateName(code) ?? code, result }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state } = await params
  const { code, name, result } = await load(state)

  const soonest = result.rows.find((r) => r.due_at)?.due_at ?? null
  const sources = sourceList(result.rows.map((r) => r.source))

  return facetMetadata({
    path: `/state/${stateSlug(code)}`,
    title: `${name} Government Bids and Contracts`,
    description: sentences(
      `${countPhrase(result.total, 'open government bid', 'open government bids')} in ${name}`,
      sources ? `Sourced from ${sources}` : null,
      soonest ? `Next deadline ${formatDate(soonest)}` : null,
      'Free to search, no account needed',
    ),
    total: result.total,
    lastModified: result.rows[0]?.last_seen_at,
  })
}

export default async function StatePage({ params }: Props) {
  const { state } = await params
  const { code, name, result } = await load(state)
  const { states } = await listFacets()

  return (
    <FacetPage
      title={`${name} government bids and contracts`}
      result={result}
      filters={{
        values: { state: code, status: 'open' },
        states,
        omit: ['state'],
        clearHref: `/state/${stateSlug(code)}`,
      }}
      hrefFor={(n) => (n > 1 ? `/?state=${code}&page=${n}` : `/state/${stateSlug(code)}`)}
      related={{
        heading: 'Other states',
        links: states
          .filter((s) => s.value !== code)
          .slice(0, 24)
          .map((s) => ({
            label: stateName(s.value) ?? s.value,
            href: `/state/${s.slug}`,
            count: s.count,
          })),
      }}
    />
  )
}
