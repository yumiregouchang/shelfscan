// The book list: add, remove, search, save. Pure functions except load/save.
import type { BookInfo } from './openLibrary'

export interface Book extends BookInfo {
  addedAt: string // ISO time, e.g. "2026-11-22T10:15:00.000Z"
}

const STORAGE_KEY = 'shelfscan.books.v1'

/** Only the two methods we use, so tests can pass a tiny fake instead of localStorage. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

/** New list with the book at the top. Same ISBN twice -> the list is returned unchanged. */
export function addBook(books: Book[], book: Book): Book[] {
  if (books.some((b) => b.isbn === book.isbn)) return books
  return [book, ...books]
}

export function removeBook(books: Book[], isbn: string): Book[] {
  return books.filter((b) => b.isbn !== isbn)
}

/** Case-insensitive match on title, author or ISBN. Empty query -> everything. */
export function searchBooks(books: Book[], query: string): Book[] {
  const q = query.trim().toLowerCase()
  if (q === '') return books
  return books.filter(
    (b) =>
      b.title.toLowerCase().includes(q) ||
      b.authors.some((a) => a.toLowerCase().includes(q)) ||
      b.isbn.includes(q),
  )
}

function isBook(x: unknown): x is Book {
  if (typeof x !== 'object' || x === null) return false
  const b = x as Record<string, unknown>
  return (
    typeof b.isbn === 'string' &&
    typeof b.title === 'string' &&
    Array.isArray(b.authors) &&
    b.authors.every((a) => typeof a === 'string') &&
    typeof b.addedAt === 'string'
  )
}

/** Never throws: broken or missing data -> empty list. */
export function loadBooks(store: KeyValueStore = localStorage): Book[] {
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (raw === null) return []
    const data: unknown = JSON.parse(raw)
    return Array.isArray(data) ? data.filter(isBook) : []
  } catch {
    return []
  }
}

export function saveBooks(books: Book[], store: KeyValueStore = localStorage): void {
  store.setItem(STORAGE_KEY, JSON.stringify(books))
}