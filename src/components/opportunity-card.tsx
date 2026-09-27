import { formatDateTime, formatMoney, identifierLabel, SOURCE_LABELS } from '@/lib/format'
import { readDeadline, TONE_DOT, TONE_TEXT } from '@/lib/deadline'
import { agencySlug, naicsSlug, stateName, stateSlug } from '@/lib/slugs'
import type { OpportunityRow } from '@/lib/types'
import { Badge, cardSurface, cn } from './ui'

function place(row: OpportunityRow): string | null {
  const region = row.state ? (stateName(row.state) ?? row.state) : null
  if (row.city && region) return `${row.city}, ${region}`
  if (region ?? row.city) return region ?? row.city

  // grants.ts sets state null deliberately: federal grants are nationwide.
  // A null from SAM means unlisted, so it stays silent rather than guessing.
  return row.source === 'grants' ? 'Nationwide' : null
}

export interface OpportunityCardProps {
  row: OpportunityRow
  /** Points at the indexable detail page, never straight out to the source. */
  href?: string
  /** Match the surrounding outline. The results list runs these under an h2. */
  headingLevel?: 2 | 3 | 4
  className?: string
}

export function OpportunityCard({
  row,
  href,
  headingLevel = 3,
  className,
}: OpportunityCardProps) {
  const deadline = readDeadline(row)
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4'
  const where = place(row)
  const naics = row.naics.slice(0, 3)

  return (
    <article
      className={cn(
        cardSurface,
        'p-4 transition-colors hover:border-strong sm:p-5',
        'flex flex-col gap-3 sm:flex-row sm:gap-5',
        className,
      )}
    >
      <div className="order-2 min-w-0 flex-1 sm:order-1">
        <Heading className="text-title font-semibold">
          <a
            href={href ?? `/opportunity/${row.id}`}
            className="text-ink underline decoration-hairline hover:decoration-accent"
          >
            {row.title}
          </a>
        </Heading>

        {row.description ? (
          <p className="mt-1.5 line-clamp-2 text-meta text-muted">{row.description}</p>
        ) : null}

        {/* One line, so location stops reading as a third line of the description. */}
        {row.agency || row.sub_agency || where ? (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta">
            {row.agency ? (
              <a
                href={`/agency/${agencySlug(row.agency)}`}
                className="inline-flex min-h-facet-tap items-center font-medium text-accent underline decoration-hairline hover:decoration-accent"
              >
                {row.agency}
              </a>
            ) : null}

            {row.sub_agency ? (
              <>
                <span className="text-hairline" aria-hidden="true">
                  &middot;
                </span>
                <span className="text-muted">{row.sub_agency}</span>
              </>
            ) : null}

            {where ? (
              <>
                {row.agency || row.sub_agency ? (
                  <span className="text-hairline" aria-hidden="true">
                    &middot;
                  </span>
                ) : null}
                {row.state ? (
                  <a
                    href={`/state/${stateSlug(row.state)}`}
                    className="inline-flex min-h-facet-tap items-center text-accent underline decoration-hairline hover:decoration-accent"
                  >
                    {where}
                  </a>
                ) : (
                  <span className="text-muted">{where}</span>
                )}
              </>
            ) : null}
          </p>
        ) : null}

        {row.award_amount != null ? (
          <p className="mt-1.5 text-meta text-ink" data-numeric>
            Award {formatMoney(row.award_amount)}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge href={`/?source=${row.source}`}>
            {SOURCE_LABELS[row.source] ?? row.source}
          </Badge>

          {identifierLabel(row) ? <Badge mono>{identifierLabel(row)}</Badge> : null}

          {row.set_aside ? <Badge tone="fact">{row.set_aside}</Badge> : null}

          {row.notice_type ? <Badge>{row.notice_type}</Badge> : null}

          {naics.map((code) => (
            <Badge key={code} href={`/naics/${naicsSlug(code)}`} mono>
              NAICS {code}
            </Badge>
          ))}
        </div>
      </div>

      {/* Fixed width so a list of these forms one deadline column down the page. */}
      <div className="order-1 sm:order-2 sm:w-rail sm:shrink-0 sm:border-l sm:border-hairline sm:pl-4">
        <p
          className={cn('flex items-start gap-2 text-body font-semibold', TONE_TEXT[deadline.tone])}
          data-numeric
        >
          <span
            className={cn('mt-1.5 shrink-0 rounded-full', TONE_DOT[deadline.tone])}
            aria-hidden="true"
          />
          {deadline.label}
        </p>
        {deadline.at ? (
          <p className="mt-0.5 text-micro text-muted" data-numeric>
            {formatDateTime(deadline.at)}
          </p>
        ) : null}
      </div>
    </article>
  )
}
