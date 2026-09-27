import type { ComponentProps } from 'react'
import { cn } from './cn'

/**
 * Shared surface. Exported on its own so components that need a different
 * element, such as an <article> in a results list, get the same edge without
 * fighting a className override.
 *
 * No shadow: a list of twenty five of these with drop shadows reads as a
 * sales page. The hairline is the separator.
 */
export const cardSurface = 'rounded-md border border-hairline bg-raised'

export type CardPad = 'none' | 'sm' | 'md'

const PADS: Record<CardPad, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
}

export interface CardProps extends Omit<ComponentProps<'div'>, 'className'> {
  pad?: CardPad
  className?: string
}

export function Card({ pad = 'md', className, ...props }: CardProps) {
  return <div className={cn(cardSurface, PADS[pad], className)} {...props} />
}
