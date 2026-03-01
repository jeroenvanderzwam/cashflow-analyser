/** Format a number as Dutch euro string: "€ 1.234,56" */
export function fmt(n) {
  return '€\u00a0' + n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Truncate a string to max n characters */
export function trunc(s, n = 40) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
