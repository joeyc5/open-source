import { ChevronLeftIcon, ChevronRightIcon } from './icons'
import { cn } from './cn'

export interface PaginationProps {
  page: number
  perPage: number
  total: number
  /** Every page number is a real href, or page two never gets crawled. */
  hrefFor: (page: number) => string
  className?: string
}

/** First, last, and the pages either side of the current one. */
function windowPages(page: number, totalPages: number): (number | 'gap')[] {
  const keep = new Set<number>([1, totalPages, page - 1, page, page + 1])
  const pages = [...keep].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b)

  const out: (number | 'gap')[] = []
  pages.forEach((n, i) => {
    if (i > 0 && n - pages[i - 1] > 1) out.push('gap')
    out.push(n)
  })
  return out
}

const STEP = 'inline-flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-meta font-medium'
const CELL = 'inline-flex h-9 min-w-9 items-center justify-center rounded-sm px-2 text-meta'

export function Pagination({ page, perPage, total, hrefFor, className }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  if (totalPages < 2) return null

  const current = Math.min(Math.max(1, page), totalPages)
  const from = (current - 1) * perPage + 1
  const to = Math.min(current * perPage, total)

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex flex-wrap items-center justify-between gap-3', className)}
    >
      <p className="text-meta text-muted" data-numeric>
        {from} to {to} of {total}
      </p>

      <ul className="flex flex-wrap items-center gap-1">
        <li>
          {current > 1 ? (
            <a href={hrefFor(current - 1)} rel="prev" className={cn(STEP, 'text-accent hover:bg-accent-wash')}>
              <ChevronLeftIcon />
              Previous
            </a>
          ) : (
            <span className={cn(STEP, 'text-muted')}>
              <ChevronLeftIcon />
              Previous
            </span>
          )}
        </li>

        {windowPages(current, totalPages).map((entry, i) =>
          entry === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden="true" className={cn(CELL, 'text-muted')}>
              &hellip;
            </li>
          ) : entry === current ? (
            <li key={entry}>
              <a
                href={hrefFor(entry)}
                aria-current="page"
                className={cn(CELL, 'bg-accent-wash font-semibold text-accent')}
                data-numeric
              >
                {entry}
              </a>
            </li>
          ) : (
            <li key={entry}>
              <a
                href={hrefFor(entry)}
                className={cn(CELL, 'text-ink hover:bg-sunken')}
                data-numeric
              >
                {entry}
              </a>
            </li>
          ),
        )}

        <li>
          {current < totalPages ? (
            <a href={hrefFor(current + 1)} rel="next" className={cn(STEP, 'text-accent hover:bg-accent-wash')}>
              Next
              <ChevronRightIcon />
            </a>
          ) : (
            <span className={cn(STEP, 'text-muted')}>
              Next
              <ChevronRightIcon />
            </span>
          )}
        </li>
      </ul>
    </nav>
  )
}
