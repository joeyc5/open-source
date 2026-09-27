import { Suspense } from 'react'
import Link from 'next/link'
import { SITE_NAME } from '@/lib/site'
import { Input, SearchIcon, SiteMark } from './ui'
import { HeaderSearchFields } from './header-search-fields'

/**
 * Sticky, because the search field is the product and a contractor twenty rows
 * into a list should not have to scroll back up to change the query. The form
 * is a plain GET, so it works before any JavaScript loads.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-raised">
      <div className="mx-auto flex max-w-shell items-center gap-3 px-4 py-2.5 sm:gap-6 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-title font-semibold text-ink hover:text-accent"
        >
          <SiteMark className="shrink-0" />
          {SITE_NAME}
        </Link>

        <form role="search" action="/" method="get" className="ml-auto w-full max-w-field">
          {/* The fallback is the same field without the URL read, so the form
              still submits before hydration. */}
          <Suspense
            fallback={
              <Input
                label="Search bids"
                hideLabel
                type="search"
                name="q"
                icon={<SearchIcon />}
                placeholder="roofing, HVAC, Caltrans"
                autoComplete="off"
              />
            }
          >
            <HeaderSearchFields />
          </Suspense>
        </form>
      </div>
    </header>
  )
}
