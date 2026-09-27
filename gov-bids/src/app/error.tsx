'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui'

/**
 * Route-level error boundary.
 *
 * The console.error is the point: Vercel captures it, so a production failure
 * lands somewhere findable instead of showing a blank frame and vanishing.
 * `digest` is the id that ties this render to the server log entry, so it is
 * shown rather than hidden.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[gov-bids] render failed', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="mx-auto max-w-prose px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-h1 font-semibold tracking-tight text-ink">
        Something broke on our side
      </h1>
      <p className="mt-3 text-body text-muted">
        The bid data is fine. This page failed to render. Trying again often
        works, since most failures here are a source timing out.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="secondary" href="/">
          Search all bids
        </Button>
      </div>

      {error.digest ? (
        <p className="mt-8 text-micro text-muted" data-numeric>
          Reference {error.digest}
        </p>
      ) : null}
    </div>
  )
}
