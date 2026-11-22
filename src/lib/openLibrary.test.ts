import { describe, expect, it } from 'vitest'
import { coverUrl, lookupIsbn, parseEdition } from './openLibrary'
import edition from './fixtures/edition-9780140328721.json'
import author from './fixtures/author-OL34184A.json'

const ISBN = '9780140328721'
const EDITION_URL = `https://openlibrary.org/isbn/${ISBN}.json`
const AUTHOR_URL = 'https://openlibrary.org/authors/OL34184A.json'

type Route = { status: number; body: string }

/** A fake fetch: answers from a table of URLs; unknown URLs act like a network failure. */
function fakeFetch(routes: Record<string, Route>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const route = routes[String(input)]
    if (!route) throw new TypeError('Failed to fetch')
    return new Response(route.body, { status: route.status })
  }) as typeof fetch
}

const ok = (json: unknown): Route => ({ status: 200, body: JSON.stringify(json) })

describe('parseEdition', () => {
  it('reads the fields we need from a real response', () => {
    expect(parseEdition(edition)).toEqual({
      title: 'Fantastic Mr. Fox',
      authorKeys: ['/authors/OL34184A'],
      publishDate: 'October 1, 1988',
      coverId: edition.covers[0],
    })
  })
  it('returns null without a title', () => {
    expect(parseEdition({ authors: [] })).toBeNull()
    expect(parseEdition({ title: '   ' })).toBeNull()
    expect(parseEdition(null)).toBeNull()
    expect(parseEdition('hello')).toBeNull()
  })
  it('skips malformed authors and covers instead of crashing', () => {
    expect(parseEdition({ title: 'X', authors: [42, { name: 'no key' }], covers: ['oops'] })).toEqual({
      title: 'X',
      authorKeys: [],
    })
  })
})

describe('lookupIsbn', () => {
  it('returns title, author names and cover', async () => {
    const fetchFn = fakeFetch({ [EDITION_URL]: ok(edition), [AUTHOR_URL]: ok(author) })
    expect(await lookupIsbn(ISBN, fetchFn)).toEqual({
      ok: true,
      book: {
        isbn: ISBN,
        title: 'Fantastic Mr. Fox',
        authors: ['Roald Dahl'],
        publishDate: 'October 1, 1988',
        coverUrl: coverUrl(edition.covers[0]),
      },
    })
  })
  it('still succeeds when the author request fails', async () => {
    const fetchFn = fakeFetch({ [EDITION_URL]: ok(edition) })
    const result = await lookupIsbn(ISBN, fetchFn)
    expect(result.ok && result.book.authors).toEqual([])
  })
  it('reports not-found on 404', async () => {
    const fetchFn = fakeFetch({ [EDITION_URL]: { status: 404, body: 'Not Found' } })
    expect(await lookupIsbn(ISBN, fetchFn)).toEqual({ ok: false, reason: 'not-found' })
  })
  it('reports server on 429 or 500', async () => {
    for (const status of [429, 500]) {
      const fetchFn = fakeFetch({ [EDITION_URL]: { status, body: '' } })
      expect(await lookupIsbn(ISBN, fetchFn)).toEqual({ ok: false, reason: 'server' })
    }
  })
  it('reports network when fetch throws', async () => {
    expect(await lookupIsbn(ISBN, fakeFetch({}))).toEqual({ ok: false, reason: 'network' })
  })
  it('reports bad-response when the body is not JSON', async () => {
    const fetchFn = fakeFetch({ [EDITION_URL]: { status: 200, body: '<html>' } })
    expect(await lookupIsbn(ISBN, fetchFn)).toEqual({ ok: false, reason: 'bad-response' })
  })
    it('reports bad-response when the JSON has no title', async () => {
    const fetchFn = fakeFetch({ [EDITION_URL]: ok({ authors: [{ key: '/authors/OL34184A' }] }) })
    expect(await lookupIsbn(ISBN, fetchFn)).toEqual({ ok: false, reason: 'bad-response' })
  })
})