import type { SVGProps } from 'react'

/**
 * One stroke weight, one grid, one cap style across the set. Drawn rather than
 * borrowed so the marks match the tight radii the rest of the system uses.
 */
type IconProps = SVGProps<SVGSVGElement>

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="7" cy="7" r="4.25" />
      <path d="m10.2 10.2 3.05 3.05" />
    </Svg>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4 6.25 4 3.5 4-3.5" />
    </Svg>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.75 3.5 5.5 8l4.25 4.5" />
    </Svg>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.25 3.5 10.5 8l-4.25 4.5" />
    </Svg>
  )
}

export function ExternalIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12.5 9v3.25a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1H7" />
      <path d="M10 2.5h3.5V6" />
      <path d="m8 8 5.25-5.25" />
    </Svg>
  )
}

/**
 * The site mark: a posted notice with a signal dot in the corner. The dot is
 * the same shape and size the cards use for a deadline, which is the one idea
 * the whole interface is built around.
 */
export function SiteMark(props: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect
        x="2.75"
        y="1.75"
        width="14.5"
        height="16.5"
        rx="2"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <path
        d="M6.25 6.25h7.5M6.25 9.5h7.5M6.25 12.75h3.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <circle cx="14.25" cy="14.25" r="2.75" fill="var(--accent)" />
    </svg>
  )
}
