import type { ComponentProps, ReactNode } from 'react'
import { cn } from './cn'

export interface InputProps extends Omit<ComponentProps<'input'>, 'className'> {
  /** Always required. Hide it visually with hideLabel rather than dropping it. */
  label: string
  hideLabel?: boolean
  /** Sits inside the field, before the text. Decorative only. */
  icon?: ReactNode
  className?: string
  fieldClassName?: string
}

export function Input({
  label,
  hideLabel,
  icon,
  className,
  fieldClassName,
  id,
  name,
  ...props
}: InputProps) {
  const fieldId = id ?? name

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label
        htmlFor={fieldId}
        className={cn(
          'text-meta font-medium text-ink',
          hideLabel && 'sr-only',
        )}
      >
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
            {icon}
          </span>
        ) : null}
        <input
          id={fieldId}
          name={name}
          className={cn(
            'h-tap w-full rounded-sm border border-strong bg-raised text-input text-ink',
            'placeholder:text-muted',
            icon ? 'pl-9 pr-3' : 'px-3',
            fieldClassName,
          )}
          {...props}
        />
      </div>
    </div>
  )
}
