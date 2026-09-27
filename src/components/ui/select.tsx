import type { ComponentProps } from 'react'
import { ChevronDownIcon } from './icons'
import { cn } from './cn'

export interface SelectProps extends Omit<ComponentProps<'select'>, 'className'> {
  label: string
  hideLabel?: boolean
  className?: string
  fieldClassName?: string
}

/**
 * A native select on purpose: it works inside a plain GET form with no
 * JavaScript, and it hands phone users the OS picker they already know.
 */
export function Select({
  label,
  hideLabel,
  className,
  fieldClassName,
  id,
  name,
  children,
  ...props
}: SelectProps) {
  const fieldId = id ?? name

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label
        htmlFor={fieldId}
        className={cn('text-meta font-medium text-ink', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={fieldId}
          name={name}
          className={cn(
            'h-tap w-full appearance-none rounded-sm border border-strong bg-raised',
            'pl-3 pr-9 text-input text-ink',
            fieldClassName,
          )}
          {...props}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
          <ChevronDownIcon />
        </span>
      </div>
    </div>
  )
}
