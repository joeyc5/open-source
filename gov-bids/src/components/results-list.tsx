import { OpportunityCard } from './opportunity-card'
import { EmptyState, Pagination } from './ui'
import type { SearchResult } from '@/lib/search'

export interface ResultsListProps {
  result: SearchResult
  /** Page numbers must be real hrefs or page two never gets crawled. */
  hrefFor: (page: number) => string
  /** Shown instead of the list when nothing matched. */
  emptyTitle: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  headingLevel?: 2 | 3 | 4
}

/**
 * The results list, shared by the search page and every facet page so a bid
 * looks and behaves identically wherever a visitor meets it.
 */
export function ResultsList({
  result,
  hrefFor,
  emptyTitle,
  emptyDescription,
  emptyAction,
  headingLevel = 2,
}: ResultsListProps) {
  if (result.total === 0) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
    )
  }

  return (
    <>
      {/* Just the size. Pagination already prints the range, and on a single
          page "1 to 10 of 10" only restates what is on screen. */}
      <p className="text-meta text-muted" aria-live="polite">
        {result.total.toLocaleString()} {result.total === 1 ? 'bid' : 'bids'}
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {result.rows.map((row) => (
          <li key={`${row.source}:${row.source_id}`}>
            <OpportunityCard row={row} headingLevel={headingLevel} />
          </li>
        ))}
      </ul>

      <Pagination
        className="mt-8"
        page={result.page}
        perPage={result.perPage}
        total={result.total}
        hrefFor={hrefFor}
      />
    </>
  )
}
