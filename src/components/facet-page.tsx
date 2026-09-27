import { ResultsList } from './results-list'
import { FilterBar, type FilterValues } from './filter-bar'
import { Badge, Button } from './ui'
import type { SearchResult } from '@/lib/search'
import type { FacetCount } from '@/lib/db'

export interface FacetLink {
  label: string
  href: string
  count: number
}

export interface FacetPageProps {
  title: string
  result: SearchResult
  hrefFor: (page: number) => string
  /** Filters for this facet. The facet's own dimension is omitted, not
   *  defaulted, because the h1 already states it. */
  filters?: { values: FilterValues; states: FacetCount[]; omit: Array<keyof FilterValues>; clearHref: string }
  /** Sibling facets, so a crawler and a visitor both have somewhere to go next. */
  related?: { heading: string; links: FacetLink[] }
}

/**
 * The shared frame for /state, /naics and /agency. One layout so a bid reads
 * the same wherever it is met, and so the related-links block that carries
 * crawl depth exists on every facet rather than only where someone remembered.
 */
export function FacetPage({ title, result, hrefFor, filters, related }: FacetPageProps) {
  return (
    <div className="mx-auto max-w-shell px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-h1 font-semibold tracking-tight text-ink">{title}</h1>

      {filters ? (
        <FilterBar
          values={filters.values}
          states={filters.states}
          omit={filters.omit}
          clearHref={filters.clearHref}
        />
      ) : null}

      <div className="mt-8">
        <ResultsList
          result={result}
          hrefFor={hrefFor}
          emptyTitle="Nothing open here right now"
          emptyDescription="These come and go daily. Search everything to see what else is live."
          emptyAction={<Button href="/">Search all bids</Button>}
        />
      </div>

      {related && related.links.length > 0 ? (
        <nav className="mt-14 border-t border-hairline pt-8" aria-labelledby="related-facets">
          <h2 id="related-facets" className="text-h3 font-semibold text-ink">
            {related.heading}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {related.links.map((l) => (
              <li key={l.href}>
                <Badge tone="neutral" href={l.href}>
                  {l.label} {l.count.toLocaleString()}
                </Badge>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  )
}
