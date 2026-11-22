import { describe, expect, it } from 'vitest'
import { addBook, loadBooks, removeBook, saveBooks, searchBooks, type Book, type KeyValueStore } from './books'

const fox: Book = {
  isbn: '9780140328721',
  title: 'Fantastic Mr. Fox',
  authors: ['Roald Dahl'],
  addedAt: '2026-11-22T10:00:00.000Z',
}
const sicp: Book = {
  isbn: '9780262510875',
  title: 'Structure and Interpretation of Computer Programs',
  authors: ['Harold Abelson', 'Gerald Jay Sussman'],
  addedAt: '2026-11-22T11:00:00.000Z',
}

/** In-memory stand-in for localStorage */
function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  }
}

describe('addBook / removeBook', () => {
  it('puts the new book first', () => {
    expect(addBook([fox], sicp).map((b) => b.isbn)).toEqual([sicp.isbn, fox.isbn])
  })
  it('ignores a duplicate ISBN and does not mutate the input', () => {
    const list = [fox]
    expect(addBook(list, { ...fox, title: 'Other' })).toBe(list)
    expect(list).toEqual([fox])
  })
  it('removes by ISBN', () => {
    expect(removeBook([fox, sicp], fox.isbn)).toEqual([sicp])
  })
})

describe('searchBooks', () => {
  const books = [fox, sicp]
  it.each([
    ['', 2],
    ['  ', 2],
    ['fox', 1],
    ['FOX', 1],
    ['sussman', 1],
    ['978026', 1],
    ['harry potter', 0],
  ])('"%s" -> %i result(s)', (query, count) => {
    expect(searchBooks(books, query)).toHaveLength(count)
  })
})

describe('loadBooks / saveBooks', () => {
  it('round-trips through storage', () => {
    const store = memoryStore()
    saveBooks([fox, sicp], store)
    expect(loadBooks(store)).toEqual([fox, sicp])
  })
  it('returns [] when nothing is saved', () => {
    expect(loadBooks(memoryStore())).toEqual([])
  })
  it('returns [] for broken JSON instead of crashing the app', () => {
    expect(loadBooks(memoryStore({ 'shelfscan.books.v1': '{not json' }))).toEqual([])
  })
  it('drops entries that are not books', () => {
    const raw = JSON.stringify([fox, { isbn: 123 }, null, 'x'])
    expect(loadBooks(memoryStore({ 'shelfscan.books.v1': raw }))).toEqual([fox])
  })
})