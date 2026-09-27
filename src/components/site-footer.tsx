import { SITE_NAME } from '@/lib/site'
import { SOURCE_LABELS } from '@/lib/format'
import { ExternalIcon, SiteMark } from './ui'

const SOURCE_SITES: { key: string; href: string }[] = [
  { key: 'sam', href: 'https://sam.gov' },
  { key: 'grants', href: 'https://www.grants.gov' },
  { key: 'caleprocure', href: 'https://caleprocure.ca.gov' },
]

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-hairline bg-raised">
      <div className="mx-auto grid max-w-shell gap-8 px-4 py-10 sm:grid-cols-[1fr_auto] sm:px-6">
        <div className="max-w-prose">
          <p className="flex items-center gap-2 text-title font-semibold text-ink">
            <SiteMark className="shrink-0" />
            {SITE_NAME}
          </p>
          <p className="mt-3 text-body text-muted">
            Search federal and California government bids without an account.
          </p>
        </div>

        <nav aria-labelledby="footer-sources">
          <h2 id="footer-sources" className="text-meta font-semibold text-ink">
            Sources
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {SOURCE_SITES.map(({ key, href }) => (
              <li key={key}>
                <a
                  href={href}
                  className="inline-flex items-center gap-1.5 text-meta text-accent hover:underline"
                >
                  {SOURCE_LABELS[key] ?? key}
                  <ExternalIcon className="shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
