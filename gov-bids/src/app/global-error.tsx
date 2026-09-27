'use client'

import { useEffect } from 'react'

/**
 * Last resort, for a failure in the root layout itself.
 *
 * This replaces the whole document, so it ships its own html and body and
 * cannot use the design system: if the layout is what broke, the tokens it
 * loads are not there either. Plain inline styles on purpose.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[gov-bids] root layout failed', {
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#fff',
          color: '#131c26',
        }}
      >
        <main style={{ maxWidth: '32rem', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Gov Bids is down</h1>
          <p style={{ color: '#55636f', lineHeight: 1.6 }}>
            This is on us, not your connection. Try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              minHeight: '2.75rem',
              padding: '0 1rem',
              border: 0,
              borderRadius: '0.25rem',
              background: '#0a5688',
              color: '#fff',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ color: '#55636f', fontSize: '0.75rem' }}>
              Reference {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  )
}
