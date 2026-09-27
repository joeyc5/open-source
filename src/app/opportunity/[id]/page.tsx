import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { findOpportunity } from '@/lib/db'
import { parseOpportunityId } from '@/lib/slugs'
import { SITE_NAME, absoluteUrl } from '@/lib/site'
import { formatDate, formatDateTime, formatMoney, identifierLabel } from '@/lib/format'
import { readDeadline, TONE_DOT, TONE_TEXT } from '@/lib/deadline'
import { US_STATES, agencySlug, naicsSlug, stateSlug } from '@/lib/slugs'
import { clamp, sentences, sourceLabel } from '@/lib/seo'
import type { OpportunityRow } from '@/lib/types'
import { Badge, Button, ExternalIcon, cn } from '@/components/ui'
import { BidDocuments, BidDocumentsSkeleton } from '@/components/bid-documents'

type Props = { params: Promise<{ id: string }> }

/**
 * Detail pages are the whole point of the site and every one of them is
 * indexable, open or closed. Closed solicitations keep their URL forever
 * because they are the long tail, so nothing here ever emits noindex.
 *
 * There is no generateStaticParams. At hundreds of thousands of rows,
 * prerendering the entire table at build time is the wrong trade. These render
 * on demand and cache.
 */
async function load(raw: string): Promise<OpportunityRow> {
  const id = parseOpportunityId(raw)
  if (id === null) notFound()
  const row = await findOpportunity(id)
  if (!row) notFound()
  return row
}

function place(row: OpportunityRow): string | null {
  const state = row.state ? (US_STATES[row.state] ?? row.state) : null
  if (row.city && state) return `${row.city}, ${state}`
  if (row.city ?? state) return row.city ?? state
  return row.source === 'grants' ? 'Nationwide' : null
}

function describe(row: OpportunityRow): string {
  const where = place(row)
  const deadline = row.due_at ? formatDate(row.due_at) : null
  const lead = row.description?.trim()

  return clamp(
    sentences(
      lead ?? `${row.notice_type ?? 'Solicitation'} from ${row.agency ?? sourceLabel(row.source)}`,
      row.agency ? `Issued by ${row.agency}` : null,
      where,
      row.status === 'closed'
        ? deadline
          ? `Closed ${deadline}`
          : 'This solicitation has closed'
        : deadline
          ? `Responses due ${deadline}`
          : null,
    ),
    300,
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const row = await load(id)
  const url = absoluteUrl(`/opportunity/${row.id}`)
  const title = clamp(row.title, 80)
  const description = describe(row)

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
    },
    openGraph: {
      type: 'article',
      url,
      siteName: SITE_NAME,
      title,
      description,
      ...(row.posted_at ? { publishedTime: row.posted_at } : {}),
      modifiedTime: row.last_seen_at,
    },
    twitter: { card: 'summary', title, description },
    other: {
      'article:section': sourceLabel(row.source),
    },
  }
}

export default async function OpportunityPage({ params }: Props) {
  const { id } = await params
  const row = await load(id)
  const where = place(row)
  const deadline = readDeadline(row)
  const identifier = identifierLabel(row)

  const facts: Array<{ label: string; value: ReactNode }> = [
    { label: 'Agency', value: row.agency ? <a className="inline-flex min-h-facet-tap items-center text-accent underline" href={`/agency/${agencySlug(row.agency)}`}>{row.agency}</a> : null },
    { label: 'Office', value: row.sub_agency ?? row.office },
    { label: 'Notice type', value: row.notice_type },
    { label: 'Place of performance', value: where ? (row.state ? <a className="inline-flex min-h-facet-tap items-center text-accent underline" href={`/state/${stateSlug(row.state)}`}>{where}</a> : where) : null },
    { label: 'Identifier', value: identifier ? <span className="font-mono">{identifier}</span> : null },
    { label: 'NAICS', value: row.naics.length ? <span className="flex flex-wrap gap-2">{row.naics.map((n) => (<a key={n} className="inline-flex min-h-facet-tap items-center font-mono text-accent underline" href={`/naics/${naicsSlug(n)}`}>{n}</a>))}</span> : null },
    { label: 'Classification', value: row.psc ? <span className="font-mono">{row.psc}</span> : null },
    { label: 'Posted', value: row.posted_at ? formatDate(row.posted_at) : null },
    { label: 'Award amount', value: row.award_amount != null ? formatMoney(row.award_amount) : null },
  ].filter((f) => f.value != null && f.value !== '')

  return (
    <article className="mx-auto max-w-shell px-4 py-8 sm:px-6 sm:py-10">
      <p className="text-meta text-muted">
        <Link className="text-accent underline" href="/">All bids</Link>
        {row.state ? (<> / <a className="text-accent underline" href={`/state/${stateSlug(row.state)}`}>{US_STATES[row.state] ?? row.state}</a></>) : null}
      </p>

      <h1 className="mt-3 max-w-prose text-h1 font-semibold tracking-tight text-ink">{row.title}</h1>

      {/* The deadline reads exactly as it did on the card that linked here. */}
      <div className="mt-5 flex flex-wrap items-start gap-x-8 gap-y-4">
        <div>
          <p className={cn('flex items-start gap-2 text-body font-semibold', TONE_TEXT[deadline.tone])} data-numeric>
            <span className={cn('mt-1.5 shrink-0 rounded-full', TONE_DOT[deadline.tone])} aria-hidden="true" />
            {deadline.label}
          </p>
          {deadline.at ? (
            <p className="mt-0.5 text-micro text-muted" data-numeric>{formatDateTime(deadline.at)}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge href={`/?source=${row.source}`}>{sourceLabel(row.source)}</Badge>
          {row.set_aside ? <Badge tone="fact">{row.set_aside}</Badge> : null}
        </div>
      </div>

      {row.source_url ? (
        <div className="mt-6">
          <Button href={row.source_url} rel="noopener nofollow" target="_blank">
            View on {sourceLabel(row.source)}
            <ExternalIcon />
          </Button>
        </div>
      ) : null}

      <dl className="mt-8 grid gap-x-8 gap-y-4 border-t border-hairline pt-6 sm:grid-cols-2">
        {facts.map((f) => (
          <div key={f.label}>
            <dt className="text-micro font-medium uppercase tracking-wide text-muted">{f.label}</dt>
            <dd className="mt-1 text-body text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>

      <Suspense fallback={<BidDocumentsSkeleton />}>
        <BidDocuments row={row} />
      </Suspense>

      {row.description?.trim() ? (
        <section className="mt-10 border-t border-hairline pt-6">
          <h2 className="text-h3 font-semibold text-ink">Description</h2>
          <p className="mt-3 max-w-prose whitespace-pre-line text-body leading-relaxed text-ink">
            {row.description.trim()}
          </p>
        </section>
      ) : null}

      <p className="mt-10 border-t border-hairline pt-6 text-meta text-muted">
        Republished from {sourceLabel(row.source)}, last checked {formatDate(row.last_seen_at)}.
        Confirm the deadline on {sourceLabel(row.source)} before you bid.
      </p>
    </article>
  )
}
