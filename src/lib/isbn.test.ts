import { describe, expect, it } from 'vitest'
import { ean13CheckDigit, isIsbn13, isValidEan13, isbn10To13, normalizeIsbn, toIsbn13 } from './isbn'

describe('normalizeIsbn', () => {
  it('removes hyphens and spaces', () => {
    expect(normalizeIsbn(' 978-0-14-032872-1 ')).toBe('9780140328721')
  })
})

describe('ean13CheckDigit', () => {
  it('matches a worked example', () => {
    // 9 7 8 0 1 4 0 3 2 8 7 2  x weights 1 3 1 3 ... -> sum 99 -> check digit 1
    expect(ean13CheckDigit('978014032872')).toBe(1)
  })
  it('matches a second known ISBN', () => {
    expect(ean13CheckDigit('978030640615')).toBe(7) // 978-0-306-40615-7
  })
  it('returns 0, not 10, when the sum is a multiple of 10', () => {
    expect(ean13CheckDigit('000000000000')).toBe(0)
  })
})

describe('isValidEan13', () => {
  it('accepts a correct code', () => {
    expect(isValidEan13('9780140328721')).toBe(true)
  })
  it('rejects a wrong check digit', () => {
    expect(isValidEan13('9780140328722')).toBe(false)
  })
  it('rejects two swapped neighbouring digits', () => {
    expect(isValidEan13('9780140382721')).toBe(false) // ...3[28]7... -> ...3[82]7...
  })
  it('cannot detect a swap of two digits that differ by 5 (known limit)', () => {
    expect(isValidEan13('9780140328271')).toBe(true) // ...8[72]1 -> ...8[27]1
  })
  it('rejects wrong length and non-digits', () => {
    expect(isValidEan13('978014032872')).toBe(false)
    expect(isValidEan13('97801403287211')).toBe(false)
    expect(isValidEan13('97801403a8721')).toBe(false)
    expect(isValidEan13('')).toBe(false)
  })
})

describe('isIsbn13', () => {
  it('accepts 978 and 979 prefixes', () => {
    expect(isIsbn13('9780140328721')).toBe(true)
    expect(isIsbn13('9791032305690')).toBe(true)
  })
  it('rejects a valid EAN-13 that is not a book', () => {
    expect(isValidEan13('4006381333931')).toBe(true)
    expect(isIsbn13('4006381333931')).toBe(false)
  })
})

describe('isbn10To13', () => {
  it('converts a valid ISBN-10', () => {
    expect(isbn10To13('0140328726')).toBe('9780140328721')
  })
  it('handles X as the check digit', () => {
    expect(isbn10To13('080442957X')).toBe('9780804429573')
  })
  it('rejects an invalid ISBN-10', () => {
    expect(isbn10To13('0140328727')).toBeNull()
    expect(isbn10To13('01403287X6')).toBeNull()
  })
})

describe('toIsbn13', () => {
  it.each([
    ['9780140328721', '9780140328721'],
    ['978-0-14-032872-1', '9780140328721'],
    ['0-14-032872-6', '9780140328721'],
    ['080442957x', '9780804429573'],
    ['9780140328722', null],
    ['4006381333931', null],
    ['hello', null],
  ])('%s -> %s', (input, expected) => {
    expect(toIsbn13(input)).toBe(expected)
  })
})