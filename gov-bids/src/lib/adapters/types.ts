import type { NormalizedOpportunity } from '@/lib/types'

/**
 * `http` adapters use fetch and can run anywhere.
 * `headless` adapters drive a real browser and only run in CI.
 */
export type FetchStrategy = 'http' | 'headless'

export interface RunContext {
  /** Skip anything posted before this. Adapters that cannot filter ignore it. */
  since?: Date
  log: (msg: string) => void
}

export interface Adapter {
  key: string
  label: string
  strategy: FetchStrategy
  /** Minimum gap between outbound requests, in milliseconds. */
  minDelayMs: number
  /**
   * A run yielding fewer rows than this is treated as broken, so the runner
   * skips the close pass instead of closing every row from this source.
   */
  minExpectedRows: number
  fetch(ctx: RunContext): AsyncIterable<NormalizedOpportunity>
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
