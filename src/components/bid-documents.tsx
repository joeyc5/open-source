import { fetchDocuments, formatBytes } from '@/lib/documents'
import { sourceLabel } from '@/lib/seo'
import { ExternalIcon } from './ui'
import type { OpportunityRow } from '@/lib/types'

/**
 * The solicitation itself: drawings, wage determinations, amendments, the
 * scope of work. This is what a contractor came for, so it sits above the
 * description rather than under it.
 *
 * Rendered inside Suspense by the caller, because the list is fetched live
 * from the agency and the rest of the page should not wait on it.
 */
export async function BidDocuments({ row }: { row: OpportunityRow }) {
  const docs = await fetchDocuments(row)
  if (docs.length === 0) return null

  return (
    <section className="mt-10 border-t border-hairline pt-6">
      <h2 className="text-h3 font-semibold text-ink">
        {docs.length === 1 ? 'Solicitation document' : `Solicitation documents (${docs.length})`}
      </h2>

      <ul className="mt-4 flex flex-col gap-1">
        {docs.map((doc) => {
          const size = formatBytes(doc.size)
          return (
            <li key={doc.url}>
              <a
                href={doc.url}
                rel="noopener nofollow"
                target="_blank"
                className="group flex min-h-tap items-center gap-3 rounded-sm px-2 -mx-2 hover:bg-sunken"
              >
                {doc.kind ? (
                  <span
                    className="shrink-0 rounded-xs border border-hairline bg-sunken px-1.5 py-0.5 font-mono text-micro uppercase text-muted"
                    aria-hidden="true"
                  >
                    {doc.kind}
                  </span>
                ) : null}

                <span className="min-w-0 flex-1 truncate text-body text-accent underline decoration-hairline group-hover:decoration-accent">
                  {doc.name}
                </span>

                {size ? (
                  <span className="shrink-0 text-micro text-muted" data-numeric>
                    {size}
                  </span>
                ) : null}
                <ExternalIcon className="shrink-0 text-muted" />
              </a>
            </li>
          )
        })}
      </ul>

      <p className="mt-3 text-micro text-muted">
        Hosted by {sourceLabel(row.source)}. Downloads come straight from them.
      </p>
    </section>
  )
}

/** Holds the space while the agency responds, so the page does not jump. */
export function BidDocumentsSkeleton() {
  return (
    <section className="mt-10 border-t border-hairline pt-6" aria-hidden="true">
      <div className="h-5 w-56 rounded-xs bg-sunken" />
      <div className="mt-4 flex flex-col gap-2">
        <div className="h-6 w-full rounded-xs bg-sunken" />
        <div className="h-6 w-4/5 rounded-xs bg-sunken" />
      </div>
    </section>
  )
}
