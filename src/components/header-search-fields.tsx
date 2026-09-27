'use client'

import { useSearchParams } from 'next/navigation'
import { Input, SearchIcon } from './ui'

/**
 * The header search field, prefilled from the current URL.
 *
 * A layout cannot read searchParams in Next 16, and calling headers() up there
 * would force every page dynamic and kill the prerendering the facet routes
 * depend on. Reading the URL from a small client component keeps the pages
 * static and costs one hydration.
 *
 * The hidden inputs are the point: the header used to submit `q` alone, so
 * searching from a filtered view silently discarded the state, source and
 * status the visitor had already chosen.
 */
export function HeaderSearchFields() {
  const params = useSearchParams()
  const carried = (['state', 'source', 'status'] as const)
    .map((key) => [key, params.get(key)] as const)
    .filter(([, value]) => Boolean(value))

  return (
    <>
      <Input
        label="Search bids"
        hideLabel
        type="search"
        name="q"
        defaultValue={params.get('q') ?? ''}
        icon={<SearchIcon />}
        placeholder="roofing, HVAC, Caltrans"
        autoComplete="off"
      />
      {carried.map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value ?? ''} />
      ))}
    </>
  )
}
