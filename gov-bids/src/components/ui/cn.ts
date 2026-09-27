export type ClassValue = string | false | null | undefined

/**
 * Joins class names. Deliberately not tailwind-merge: variants below cover the
 * real cases, so nothing here needs to override a base class by passing a
 * conflicting one through className.
 */
export function cn(...parts: ClassValue[]): string {
  return parts.filter(Boolean).join(' ')
}
