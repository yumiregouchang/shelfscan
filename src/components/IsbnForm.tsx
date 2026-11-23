import { useState, type FormEvent } from 'react'

interface Props {
  onSubmit: (raw: string) => void
  disabled: boolean
}

export function IsbnForm({ onSubmit, disabled }: Props) {
  const [text, setText] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault() // stop the browser from reloading the page
    if (text.trim() === '') return
    onSubmit(text)
    setText('')
  }

  return (
    <form className="isbn-form" onSubmit={handleSubmit}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="ISBN, e.g. 978-0-14-032872-1"
        inputMode="numeric"
        aria-label="ISBN"
      />
      <button type="submit" disabled={disabled}>
        Add
      </button>
    </form>
  )
}