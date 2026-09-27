import type { Metadata } from 'next'
import { findOpportunities, listFacets } from '@/lib/db'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site'
import { stateName } from '@/lib/slugs'
import { ResultsList } from '@/components/results-list'
import { Badge, Button } from '@/components/ui'
import { FilterBar } from '@/components/filter-bar'
import { DUE_WINDOWS, POSTED_WINDOWS } from '@/lib/search'

const PER_PAGE = 25

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const metadata: Metadata = {
  title: `${SITE_NAME}: Search Government Bids and Contracts`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
}

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  const t = s?.trim()
  return t ? t : undefined
}

/**
 * The search page.
 *
 * Everything is a GET parameter and every control is a plain form field, so a
 * result set is a URL someone can bookmark, share or link to, and the whole
 * page works before any JavaScript arrives. That also means Google can crawl
 * a filtered view, which is the entire distribution model.
 */
export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams
  const q = one(sp.q)
  const state = one(sp.state)?.toUpperCase()
  const source = one(sp.source)
  const naics = one(sp.naics)
  const agency = one(sp.agency)
  const setAside = one(sp.setAside)
  const due = one(sp.due)
  const posted = one(sp.posted)
  const status = one(sp.status) === 'closed' ? 'closed' : 'open'
  const page = Math.max(1, Number(one(sp.page) ?? 1) || 1)

  const [result, facets] = await Promise.all([
    findOpportunities({
      q, state, source, naics, agencyExact: agency, status, page, perPage: PER_PAGE,
      // "any" means set aside for someone, whichever programme.
      setAside: setAside && setAside !== 'any' ? setAside : undefined,
      setAsideAny: setAside === 'any' || undefined,
      dueWithinDays: due && DUE_WINDOWS[due] ? DUE_WINDOWS[due].days : undefined,
      postedWithinDays: posted && POSTED_WINDOWS[posted] ? POSTED_WINDOWS[posted].days : undefined,
    }),
    listFacets(),
  ])

  const hrefFor = (n: number) => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (state) p.set('state', state)
    if (source) p.set('source', source)
    if (naics) p.set('naics', naics)
    if (agency) p.set('agency', agency)
    if (setAside) p.set('setAside', setAside)
    if (due) p.set('due', due)
    if (posted) p.set('posted', posted)
    if (status === 'closed') p.set('status', 'closed')
    if (n > 1) p.set('page', String(n))
    const qs = p.toString()
    return qs ? `/?${qs}` : '/'
  }

  const filtered = Boolean(q || state || source || naics || agency || setAside || due || posted)

  // The empty state used to name two escapes and offer a button for neither.
  // These are built from the live params so the query survives the escape.
  const withParams = (over: Partial<Record<'q' | 'state' | 'source' | 'naics' | 'agency' | 'setAside' | 'due' | 'posted' | 'status', string | undefined>>) => {
    const merged = { q, state, source, naics, agency, setAside, due, posted, status, ...over }
    const p = new URLSearchParams()
    if (merged.q) p.set('q', merged.q)
    if (merged.state) p.set('state', merged.state)
    if (merged.source) p.set('source', merged.source)
    if (merged.naics) p.set('naics', merged.naics)
    if (merged.agency) p.set('agency', merged.agency)
    if (merged.setAside) p.set('setAside', merged.setAside)
    if (merged.due) p.set('due', merged.due)
    if (merged.posted) p.set('posted', merged.posted)
    // open is the default, so it never needs saying in the URL.
    if (merged.status === 'closed') p.set('status', 'closed')
    const qs = p.toString()
    return qs ? `/?${qs}` : '/'
  }

  return (
    <div className="mx-auto max-w-shell px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-h1 font-semibold tracking-tight text-ink">
        {headline(q, state)}
      </h1>

      <FilterBar
        values={{ q, state, source, naics, agency, setAside, due, posted, status }}
        states={facets.states}
      />

      <div className="mt-8">
        <ResultsList
          result={result}
          hrefFor={hrefFor}
          emptyTitle={
            status === 'closed' ? 'No closed bids match that' : 'No open bids match that'
          }
          emptyDescription={
            status === 'open'
              ? 'Widen the filters, or look at closed bids to see what these agencies have bought before.'
              : 'Widen the filters, or switch back to open bids.'
          }
          emptyAction={
            status === 'open' ? (
              <>
                <Button href={withParams({ status: 'closed' })}>
                  {q ? `Search closed bids for ${q}` : 'See closed bids'}
                </Button>
                {q && (state || source) ? (
                  <Button variant="secondary" href={`/?q=${encodeURIComponent(q)}`}>
                    Search {q} anywhere
                  </Button>
                ) : null}
              </>
            ) : (
              <Button href={withParams({ status: undefined })}>
                {q ? `Search open bids for ${q}` : 'See open bids'}
              </Button>
            )
          }
        />
      </div>

      {facets.states.length > 0 ? (
        <nav className="mt-14 border-t border-hairline pt-8" aria-labelledby="browse-states">
          <h2 id="browse-states" className="text-h3 font-semibold text-ink">
            Browse by state
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {facets.states.map((s) => (
              <li key={s.value}>
                <Badge tone="neutral" href={`/state/${s.slug}`}>
                  {stateName(s.value) ?? s.value} {s.count.toLocaleString()}
                </Badge>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  )
}

/** Says what the visitor is looking at, using the words they typed. */
function headline(q?: string, state?: string): string {
  const where = state ? ` in ${stateName(state) ?? state}` : ''
  if (q) return `${q}${where}`
  return state ? `Government bids${where}` : 'Search government bids and contracts'
}
