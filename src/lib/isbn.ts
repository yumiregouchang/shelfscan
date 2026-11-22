// ISBN / EAN-13 helpers. Pure functions: no DOM, no network, easy to test.

/** "978-0-14-032872-1 " -> "9780140328721" (also upper-cases a trailing x in ISBN-10) */
export function normalizeIsbn(raw: string): number {
    return raw.replace(/[\s-]/g, '').toUpperCase()
}

/** Check digit for the first 12 digits of an EAN-13. Weights are 1,3,1,3,... */
export function ean13CheckDigit(first12: string): number {
    let sum = 0
    for (let i = 0; i < 12; i++) {
        const digit = Number(first12[i])
        sum += i % 2 === 0 ? digit : digit * 3
    }
    return (10 - (sum % 10)) % 10
}

/** 13 digits and the last one matches the computed check digit */
export function isValidEan13(code: string): boolean {
    if (!/^\d{13}$/.test(code)) return false
    return ean13CheckDigit(code.slice(0,12)) === Number(code[12])
}

/** Books use EAN-13 codes that start with 978 or 979 ("Bookland") */
export function isIsbn13(code: string): boolean {
    return isValidEan13(code) && (code.startsWith('978') ||
code.startsWith('979'))
}

/** Old 10-digit ISBN -> ISBN-13. Returns null if the ISBN-10 is not valid. */
export function isbn10To13(isbn10: string): string | null {
    if (!/^\d{9}[\dX]$/.test(isbn10)) return null
    let sum = 0
    for (let i = 0; i <10; i++) {
        const value = isbn10[i] === 'X' ? 10: Number(isbn10[i])
        sum += value * (10 - i) //weights 10, 9, ..., 1
    }
    if (sum % 11 !== 0) return null
    const first12 = '978' + isbn10.slice(0, 9)
    return first12 + ean13CheckDigit(first12)
}

/** Whatever the user typed or the scanner read -> a valid ISBN-13, or null */
export function toIsbn13(raw: string): string | null {
    const code = normalizeIsbn(raw)
    if (code.length === 13) return isIsbn13(code) ? code : null
    if (code.length === 10) return isbn10To13(code)
    return null
}