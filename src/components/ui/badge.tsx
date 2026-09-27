import type { ReactNode } from 'react'
import { cn } from './cn'

export type BadgeTone = 'neutral' | 'accent' | 'fact' | 'now' | 'soon'

export interface BadgeProps {
  children: ReactNode
  /**
   * `fact` marks something that changes whether a vendor can bid at all, such
   * as a set aside. `now` and `soon` carry deadline urgency and must match the
   * card rail. `accent` is reserved for badges that are links, since it paints
   * link-coloured text.
   */
  tone?: BadgeTone
  /** Renders the label in the mono face, for identifiers people read aloud. */
  mono?: boolean
  /** Present makes the badge a link. Facet badges should always have one. */
  href?: string
  className?: string
}

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-hairline bg-sunken text-muted',
  accent: 'border-accent-wash bg-accent-wash text-accent',
  fact: 'border-accent-wash bg-accent-wash text-ink',
  now: 'border-due-now-wash bg-due-now-wash text-due-now',
  soon: 'border-due-soon-wash bg-due-soon-wash text-due-soon',
}

export function Badge({ children, tone = 'neutral', mono, href, className }: BadgeProps) {
  const classes = cn(
    'inline-flex min-h-6 items-center rounded-xs border px-1.5 text-micro',
    mono && 'font-mono',
    TONES[tone],
    href && 'hover:border-strong hover:text-ink',
    className,
  )

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    )
  }
  return <span className={classes}>{children}</span>
}
