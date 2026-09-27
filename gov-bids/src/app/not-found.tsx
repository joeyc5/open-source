import type { Metadata } from 'next'
import { Button } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Not found',
  robots: { index: false, follow: true },
}

/**
 * Reached constantly, not rarely.
 *
 * Solicitations close and agencies pull notices, so links into this site go
 * stale on their own schedule. A bare 404 sends a contractor who was already
 * interested straight back out, which is the most expensive dead end here.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-prose px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-h1 font-semibold tracking-tight text-ink">
        That bid is not here
      </h1>
      <p className="mt-3 text-body text-muted">
        It may have been withdrawn by the agency, or the link may be wrong.
        Closed bids keep their pages, so a missing one usually means the notice
        itself came down.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button href="/">Search all bids</Button>
        <Button variant="secondary" href="/state/ca">
          California bids
        </Button>
      </div>
    </div>
  )
}
