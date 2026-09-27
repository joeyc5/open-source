import { DUE_WINDOWS, POSTED_WINDOWS } from '@/lib/search'
import { SOURCE_LABELS } from '@/lib/format'
import { stateName } from '@/lib/slugs'
import type { FacetCount } from '@/lib/db'
import { Button, Input, Select } from './ui'

/**
 * The programmes a bidder actually filters by. Stored values are long and
 * legalistic ("SBA Certified Women-Owned Small Business (WOSB) Program
 * Set-Aside (FAR 19.15)"), so each option matches on a fragment rather than
 * asking anyone to read a FAR citation in a dropdown.
 */
export const SET_ASIDE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'any', label: 'Any set aside' },
  { value: 'Small Business', label: 'Small business' },
  { value: 'Service-Disabled Veteran', label: 'Service-disabled veteran (SDVOSB)' },
  { value: 'Women-Owned', label: 'Women-owned (WOSB)' },
  { value: '8(a)', label: '8(a)' },
  { value: 'HUBZone', label: 'HUBZone' },
  { value: 'Veteran-Owned', label: 'Veteran-owned' },
  { value: 'Indian Small Business', label: 'Indian small business' },
]

export interface FilterValues {
  q?: string
  state?: string
  source?: string
  naics?: string
  setAside?: string
  due?: string
  posted?: string
  status: 'open' | 'closed'
  agency?: string
}

export interface FilterBarProps {
  values: FilterValues
  states: FacetCount[]
  /** Where the form submits. Facet pages post back to themselves. */
  action?: string
  /** Dimensions the surrounding page already fixes, so the control is dropped
   *  and carried as a hidden field instead of offered twice. */
  omit?: Array<keyof FilterValues>
  clearHref?: string
}

export function FilterBar({
  values,
  states,
  action = '/',
  omit = [],
  clearHref = '/',
}: FilterBarProps) {
  const hidden = (key: keyof FilterValues) => omit.includes(key)
  const dirty = Boolean(
    values.q || values.state || values.source || values.naics || values.setAside ||
      values.due || values.posted || values.status === 'closed',
  )

  return (
    <form action={action} method="get" className="mt-6">
      {/* Carried, not shown. Dropping these silently widens the set the
          visitor arrived with. */}
      {values.q ? <input type="hidden" name="q" value={values.q} /> : null}
      {values.agency ? <input type="hidden" name="agency" value={values.agency} /> : null}
      {hidden('state') && values.state ? (
        <input type="hidden" name="state" value={values.state} />
      ) : null}
      {hidden('naics') && values.naics ? (
        <input type="hidden" name="naics" value={values.naics} />
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        {!hidden('state') ? (
          <Select
            label="State"
            name="state"
            defaultValue={values.state ?? ''}
            className="grow basis-32 min-w-0 sm:grow-0 sm:basis-auto"
          >
            <option value="">Anywhere</option>
            {states.map((s) => (
              <option key={s.value} value={s.value}>
                {stateName(s.value) ?? s.value} ({s.count.toLocaleString()})
              </option>
            ))}
          </Select>
        ) : null}

        <Select
          label="Set aside"
          name="setAside"
          defaultValue={values.setAside ?? ''}
          className="grow basis-40 min-w-0 sm:grow-0 sm:basis-auto"
        >
          <option value="">Open to anyone</option>
          {SET_ASIDE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>

        <Select
          label="Closing"
          name="due"
          defaultValue={values.due ?? ''}
          className="grow basis-36 min-w-0 sm:grow-0 sm:basis-auto"
        >
          <option value="">Any deadline</option>
          {Object.entries(DUE_WINDOWS).map(([key, w]) => (
            <option key={key} value={key}>
              {w.label}
            </option>
          ))}
        </Select>

        <Select
          label="Posted"
          name="posted"
          defaultValue={values.posted ?? ''}
          className="grow basis-36 min-w-0 sm:grow-0 sm:basis-auto"
        >
          <option value="">Any time</option>
          {Object.entries(POSTED_WINDOWS).map(([key, w]) => (
            <option key={key} value={key}>
              {w.label}
            </option>
          ))}
        </Select>

        {!hidden('naics') ? (
          <Input
            label="NAICS"
            name="naics"
            inputMode="numeric"
            pattern="[0-9]{2,6}"
            placeholder="237310"
            defaultValue={values.naics ?? ''}
            className="grow basis-28 min-w-0 sm:grow-0 sm:basis-auto"
            fieldClassName="sm:w-28"
          />
        ) : null}

        <Select
          label="Source"
          name="source"
          defaultValue={values.source ?? ''}
          className="grow basis-36 min-w-0 sm:grow-0 sm:basis-auto"
        >
          <option value="">All sources</option>
          {Object.entries(SOURCE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>

        <Select
          label="Status"
          name="status"
          defaultValue={values.status}
          className="grow basis-32 min-w-0 sm:grow-0 sm:basis-auto"
        >
          <option value="open">Open now</option>
          <option value="closed">Closed</option>
        </Select>

        <Button type="submit">Apply</Button>
        {dirty ? (
          <Button variant="ghost" href={clearHref}>
            Clear
          </Button>
        ) : null}
      </div>
    </form>
  )
}
