import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Environment names differ by how the project was wired.
 *
 * Vercel's Supabase integration writes SUPABASE_URL, SUPABASE_ANON_KEY and
 * SUPABASE_PUBLISHABLE_KEY. A hand-written .env more often uses the
 * NEXT_PUBLIC_ prefixed pair. Both are accepted so the same build runs either
 * way, and a missing variable fails loudly rather than quietly serving
 * fixtures to the public.
 */
function firstSet(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return undefined
}

export function readUrl(): string | undefined {
  return firstSet('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL')
}

export function readReadKey(): string | undefined {
  return firstSet(
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  )
}

/**
 * Read-only client for rendering pages.
 *
 * Every caller is a server component, so this key never reaches the browser
 * and does not need the NEXT_PUBLIC_ prefix. It is a publishable key bounded
 * by row level security either way.
 */
export function publicClient(): SupabaseClient {
  const url = readUrl()
  const key = readReadKey()
  if (!url || !key) {
    throw new Error(
      'Supabase read credentials missing. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or the NEXT_PUBLIC_ equivalents).',
    )
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

/** Service role. Ingest only. Never import this from anything the browser loads. */
export function serviceClient(): SupabaseClient {
  const url = readUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for ingest')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}
