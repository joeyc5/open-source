export type OpportunityStatus = 'open' | 'closed'

/** What every adapter yields. The runner owns everything else. */
export interface NormalizedOpportunity {
  source: string
  sourceId: string
  title: string
  description?: string | null
  agency?: string | null
  subAgency?: string | null
  office?: string | null
  noticeType?: string | null
  naics?: string[]
  psc?: string | null
  setAside?: string | null
  state?: string | null
  city?: string | null
  postedAt?: string | null
  dueAt?: string | null
  awardAmount?: number | null
  sourceUrl?: string | null
  raw?: Record<string, unknown>
}

export interface OpportunityRow {
  id: number
  source: string
  source_id: string
  title: string
  description: string | null
  agency: string | null
  sub_agency: string | null
  office: string | null
  notice_type: string | null
  naics: string[]
  psc: string | null
  set_aside: string | null
  state: string | null
  city: string | null
  posted_at: string | null
  due_at: string | null
  award_amount: number | null
  source_url: string | null
  status: OpportunityStatus
  first_seen_at: string
  last_seen_at: string
}
