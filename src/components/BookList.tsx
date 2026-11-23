import type { Book } from '../lib/books'

interface Props {
  books: Book[]
  emptyText: string
  onRemove: (isbn: string) => void
}

export function BookList({ books, emptyText, onRemove }: Props) {
  if (books.length === 0) return <p className="empty">{emptyText}</p>

  return (
    <ul className="book-list">
      {books.map((book) => (
        <li key={book.isbn} className="book">
          {book.coverUrl ? <img src={book.coverUrl} alt="" width={48} /> : <div className="no-cover" />}
          <div className="book-text">
            <strong>{book.title}</strong>
            <span>{book.authors.length > 0 ? book.authors.join(', ') : 'Unknown author'}</span>
            <small>
              ISBN {book.isbn}
              {book.publishDate ? ` · ${book.publishDate}` : ''}
            </small>
          </div>
          <button type="button" onClick={() => onRemove(book.isbn)} aria-label={`Remove ${book.title}`}>
            ×
          </button>
        </li>
      ))}
    </ul>
  )
}