// Look up a book on Open Library by ISBN.
// Docs: https://openlibrary.org/dev/docs/api/books

const BASE = 'https://openlibrary.org'

export interface BookInfo {
  isbn: string
  title: string
  authors: string[]
  publishDate?: string
  coverUrl?: string
}

export type LookupResult =
  | { ok: true; book: BookInfo }
  | { ok: false; reason: 'not-found' | 'network' | 'server' | 'bad-response' }

/** The parts of an edition record we use. Everything else is ignored. */
export interface Edition {
  title: string
  authorKeys: string[]
  publishDate?: string
  coverId?: number
}

/** Turn unknown JSON into an Edition, or null if the required title is missing. */
export function parseEdition(json: unknown): Edition | null {
  if (typeof json !== 'object' || json === null) return null
  const data = json as Record<string, unknown>
  if (typeof data.title !== 'string' || data.title.trim() === '') return null

  const authorKeys: string[] = []
  if (Array.isArray(data.authors)) {
    for (const a of data.authors) {
      if (typeof a === 'object' && a !== null && typeof (a as { key?: unknown }).key === 'string') {
        authorKeys.push((a as { key: string }).key)
      }
    }
  }

  const edition: Edition = { title: data.title.trim(), authorKeys }
  if (typeof data.publish_date === 'string') edition.publishDate = data.publish_date
  if (Array.isArray(data.covers) && typeof data.covers[0] === 'number' && data.covers[0] > 0) {
    edition.coverId = data.covers[0]
  }
  return edition
}

/** Cover ID -> image URL (lookups by cover ID are not rate-limited, lookups by ISBN are) */
export function coverUrl(coverId: number): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
}

async function fetchAuthorName(key: string, fetchFn: typeof fetch): Promise<string | null> {
  try {
    const res = await fetchFn(`${BASE}${key}.json`)
    if (!res.ok) return null
    const json: unknown = await res.json()
    const name = (json as { name?: unknown } | null)?.name
    return typeof name === 'string' ? name : null
  } catch {
    return null // a missing author name should not break the whole lookup
  }
}

/**
 * fetchFn defaults to the browser's fetch. Tests pass a fake one,
 * so they never touch the real network.
 */
export async function lookupIsbn(isbn: string, fetchFn: typeof fetch = fetch): Promise<LookupResult> {
  let res: Response
  try {
    res = await fetchFn(`${BASE}/isbn/${isbn}.json`)
  } catch {
    return { ok: false, reason: 'network' } // offline, DNS error, CORS error...
  }
  if (res.status === 404) return { ok: false, reason: 'not-found' }
  if (!res.ok) return { ok: false, reason: 'server' } // 429 too many requests, 500...

  let json: unknown
  try {
    json = await res.json()
  } catch {
    return { ok: false, reason: 'bad-response' } // not JSON
  }
  const edition = parseEdition(json)
  if (!edition) return { ok: false, reason: 'bad-response' }

  const names = await Promise.all(edition.authorKeys.slice(0, 3).map((key) => fetchAuthorName(key, fetchFn)))
  const authors = names.filter((name): name is string => name !== null)

  return {
    ok: true,
    book: {
      isbn,
      title: edition.title,
      authors,
      publishDate: edition.publishDate,
      coverUrl: edition.coverId ? coverUrl(edition.coverId) : undefined,
    },
  }
}