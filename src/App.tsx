import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { addBook, loadBooks, removeBook, saveBooks, searchBooks, type Book } from './lib/books'
import { toIsbn13 } from './lib/isbn'
import { lookupIsbn } from './lib/openLibrary'
import { BookList } from './components/BookList'
import { IsbnForm } from './components/IsbnForm'
import './App.css'

const Scanner = lazy(() => import('./components/Scanner').then((m) => ({ default: m.Scanner })))
const THRESHOLD_KEY = 'shelfscan.blurThreshold'
const DEFAULT_THRESHOLD = 100

const FAILURE_TEXT = {
  'not-found': 'This book is not in Open Library.',
  network: "Can't reach Open Library. Check your connection.",
  server: 'Open Library had an error (maybe too many requests). Try again later.',
  'bad-response': "Open Library sent data we can't read.",
} as const

function App() {
  const [books, setBooks] = useState<Book[]>(() => loadBooks())
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [threshold, setThreshold] = useState(() => Number(localStorage.getItem(THRESHOLD_KEY)) || DEFAULT_THRESHOLD)
  const inFlight = useRef(new Set<string>()) // ISBNs being looked up right now

  // Save whenever the list changes.
  useEffect(() => saveBooks(books), [books])
  useEffect(() => localStorage.setItem(THRESHOLD_KEY, String(threshold)), [threshold])

  const handleCode = useCallback(
    async (raw: string) => {
      const isbn = toIsbn13(raw)
      if (!isbn) {
        setMessage(`"${raw}" is not a valid ISBN.`)
        return
      }
      if (books.some((b) => b.isbn === isbn)) {
        setMessage('This book is already in your list.')
        return
      }
      if (inFlight.current.has(isbn)) return // the scanner saw the same code again
      inFlight.current.add(isbn)
      setBusy(true)
      setMessage(`Looking up ${isbn}…`)
      try {
        const result = await lookupIsbn(isbn)
        if (result.ok) {
          setBooks((prev) => addBook(prev, { ...result.book, addedAt: new Date().toISOString() }))
          setMessage(`Added: ${result.book.title}`)
        } else {
          setMessage(FAILURE_TEXT[result.reason])
        }
      } finally {
        inFlight.current.delete(isbn)
        setBusy(false)
      }
    },
    [books],
  )

  const visible = searchBooks(books, query)

  return (
    <main>
      <h1>ShelfScan</h1>
      
      <button type="button" className="primary" onClick={() => setScanning((s) => !s)}>
        {scanning ? 'Stop scanning' : 'Scan barcode'}
      </button>
      {scanning && (
        <Suspense fallback={<p>Loading scanner…</p>}>
          <Scanner onDetected={handleCode} blurThreshold={threshold} />
        </Suspense>
      )}
      {scanning && (
        <label className="threshold">
          Blur threshold {threshold}
          <input
            type="range"
            min={10}
            max={1000}
            step={10}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
        </label>
      )}
      
      <IsbnForm onSubmit={handleCode} disabled={busy} />
      <p className="message" role="status">
        {message}
      </p>

      <input
        className="search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${books.length} books by title, author or ISBN`}
      />
      <BookList
        books={visible}
        emptyText={books.length === 0 ? 'No books yet. Scan one or type an ISBN.' : 'No matching books.'}
        onRemove={(isbn) => setBooks((prev) => removeBook(prev, isbn))}
      />
    </main>
  )
}

export default App