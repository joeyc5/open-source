import type { OpportunityRow } from './types'

export interface BidDocument {
  name: string
  /** Bytes, or null when the source does not say. */
  size: number | null
  /** File extension without the dot, lowercased. */
  kind: string | null
  url: string
}

/**
 * Solicitation documents, fetched when the page renders rather than stored.
 *
 * Storing them would mean one request per opportunity per night across tens of
 * thousands of rows, to keep a copy of a list that changes whenever an agency
 * posts an amendment. Fetching on render is one request for a page somebody
 * actually opened, and it is never stale.
 *
 * Both endpoints are the ones the agencies' own sites call, and neither needs
 * a key. Failure returns an empty list: a bid with no document list is still a
 * bid worth reading, so this must never take the page down with it.
 */
export async function fetchDocuments(row: OpportunityRow): Promise<BidDocument[]> {
  try {
    if (row.source === 'sam') return await samDocuments(row.source_id)
    if (row.source === 'grants') return await grantsDocuments(row.source_id)
    return []
  } catch {
    return []
  }
}

const REVALIDATE = 60 * 60 * 6

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0 Safari/537.36'

interface SamAttachment {
  resourceId?: string
  name?: string
  mimeType?: string
  size?: number
  type?: string
  accessLevel?: string
}

async function samDocuments(noticeId: string): Promise<BidDocument[]> {
  const res = await fetch(
    `https://sam.gov/api/prod/opps/v3/opportunities/${encodeURIComponent(noticeId)}/resources`,
    // SAM serves HAL and answers 406 to a strict `application/json` Accept, so
    // this asks for anything, the way a browser does.
    { headers: { 'User-Agent': UA, Accept: '*/*' }, next: { revalidate: REVALIDATE } },
  )
  if (!res.ok) return []

  const body = (await res.json()) as {
    _embedded?: { opportunityAttachmentList?: Array<{ attachments?: SamAttachment[] }> }
  }

  return (body._embedded?.opportunityAttachmentList ?? [])
    .flatMap((group) => group.attachments ?? [])
    // Non-public attachments exist and 403 on download, so offering them would
    // be a dead end.
    .filter((a) => a.type === 'file' && a.accessLevel === 'public' && a.resourceId && a.name)
    .map((a) => ({
      name: a.name!,
      size: typeof a.size === 'number' ? a.size : null,
      kind: extension(a.name!, a.mimeType),
      url: `https://sam.gov/api/prod/opps/v3/opportunities/resources/files/${a.resourceId}/download`,
    }))
}

interface GrantsAttachment {
  id?: number
  fileName?: string
  mimeType?: string
  fileLobSize?: number
}

async function grantsDocuments(opportunityId: string): Promise<BidDocument[]> {
  const res = await fetch('https://api.grants.gov/v1/api/fetchOpportunity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ opportunityId: Number(opportunityId) }),
    next: { revalidate: REVALIDATE },
  })
  if (!res.ok) return []

  const body = (await res.json()) as {
    data?: {
      synopsisAttachmentFolders?: Array<{ synopsisAttachments?: GrantsAttachment[] }>
    }
  }

  return (body.data?.synopsisAttachmentFolders ?? [])
    .flatMap((folder) => folder.synopsisAttachments ?? [])
    .filter((a) => a.id && a.fileName)
    .map((a) => ({
      name: a.fileName!,
      size: typeof a.fileLobSize === 'number' ? a.fileLobSize : null,
      kind: extension(a.fileName!, a.mimeType),
      url: `https://grants.gov/grantsws/rest/opportunity/att/download/${a.id}`,
    }))
}

/** SAM sends ".pdf" as its mimeType, Grants.gov sends "application/pdf". */
function extension(name: string, mimeType?: string): string | null {
  const fromName = /\.([a-z0-9]{1,5})$/i.exec(name)?.[1]
  if (fromName) return fromName.toLowerCase()
  const fromMime = mimeType?.replace(/^\./, '').split('/').pop()
  return fromMime ? fromMime.toLowerCase() : null
}

export function formatBytes(n: number | null): string | null {
  if (n == null || n <= 0) return null
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
  const value = n / 1024 ** i
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}
