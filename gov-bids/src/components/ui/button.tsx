import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md'

interface Shared {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

type AsButton = Shared & { href?: undefined } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    keyof Shared
  >
type AsLink = Shared & { href: string } & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    keyof Shared
  >

export type ButtonProps = AsButton | AsLink

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-hover',
  secondary: 'border border-strong bg-raised text-ink hover:bg-sunken',
  ghost: 'text-accent hover:bg-accent-wash',
}

const SIZES: Record<ButtonSize, string> = {
  // Full height by default. This gets tapped with work gloves on.
  md: 'h-tap px-4 text-body',
  sm: 'h-9 px-3 text-meta',
}

export function Button(props: ButtonProps) {
  const { children, variant = 'primary', size = 'md', className } = props
  const classes = cn(
    'inline-flex select-none items-center justify-center gap-2 rounded-sm font-medium',
    'transition-colors disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  )

  if (props.href !== undefined) {
    const { children: _c, variant: _v, size: _s, className: _cl, ...rest } = props
    return (
      <a className={classes} {...rest}>
        {children}
      </a>
    )
  }

  const { children: _c, variant: _v, size: _s, className: _cl, href: _h, ...rest } = props
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  )
}
