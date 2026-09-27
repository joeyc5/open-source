import type { ReactNode } from 'react'
import { cardSurface } from './card'
import { cn } from './cn'

export interface EmptyStateProps {
  /** Name the way out, not the situation. "Try a wider search", never "No results found". */
  title: string
  description?: string
  /** Buttons or links that actually perform the recovery the title names. */
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(cardSurface, 'px-5 py-10 sm:px-8 sm:py-14', className)}>
      <div className="max-w-prose">
        <h2 className="text-h3 font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-2 text-body text-muted">{description}</p> : null}
        {action ? <div className="mt-5 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  )
}
