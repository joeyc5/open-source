import type { Adapter } from './types'
import { samAdapter } from './sam'
import { grantsAdapter } from './grants'
import { calEProcureAdapter } from './caleprocure'

export const adapters: Adapter[] = [samAdapter, grantsAdapter, calEProcureAdapter]

export function adapterByKey(key: string): Adapter | undefined {
  return adapters.find((a) => a.key === key)
}
