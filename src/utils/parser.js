/**
 * parser.js — ING CSV → Transaction[]
 * Knows only about ING's file format, nothing about business logic.
 */

/**
 * Parse a Dutch decimal string to a JS number.
 * "1.234,56" → 1234.56
 */
function parseAmount(s) {
  return parseFloat(s.replace(/\./g, '').replace(',', '.'))
}

/**
 * Parse ING date string "YYYYMMDD" to a Date (noon UTC to avoid DST shifts).
 */
function parseDate(s) {
  const y = parseInt(s.slice(0, 4), 10)
  const m = parseInt(s.slice(4, 6), 10) - 1 // 0-indexed
  const d = parseInt(s.slice(6, 8), 10)
  return new Date(Date.UTC(y, m, d, 12, 0, 0))
}

/**
 * Split one ING CSV line into 11 fields.
 * ING wraps every field in double quotes; semicolons separate fields.
 */
function parseLine(line) {
  return line.split(';').map(f => f.replace(/^"|"$/g, '').trim())
}

/**
 * Parse a full ING CSV export (UTF-8 text) into an array of Transactions.
 * Returns transactions sorted oldest-first.
 */
export function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0)
  const dataLines = lines.slice(1) // skip header row
  const transactions = []

  dataLines.forEach((line, index) => {
    const fields = parseLine(line)
    if (fields.length < 10) return // skip malformed lines

    const [
      datum,          // 0  YYYYMMDD
      naam,           // 1  Naam / Omschrijving
      rekening,       // 2  Rekening
      tegenrekening,  // 3  Tegenrekening
      code,           // 4  Code
      afBij,          // 5  Af Bij
      bedrag,         // 6  Bedrag (EUR)
      mutatiesoort,   // 7  Mutatiesoort
      mededelingen,   // 8  Mededelingen
      saldo,          // 9  Saldo na mutatie
      // tag           // 10 Tag — always empty, ignored
    ] = fields

    const date = parseDate(datum)

    transactions.push({
      id:             datum + '-' + index,
      date,
      year:           date.getUTCFullYear(),
      month:          date.getUTCMonth() + 1,
      name:           naam,
      nameLower:      naam.toLowerCase(),
      account:        rekening,
      counterAccount: tegenrekening,
      code,
      direction:      afBij === 'Bij' ? 'credit' : 'debit',
      amount:         parseAmount(bedrag),
      mutationType:   mutatiesoort,
      description:    mededelingen,
      balanceAfter:   parseAmount(saldo),
      // To be filled by analyser:
      category:       null,
      transactionClass: null,
      isRecurring:    false,
      recurringKey:   '',
    })
  })

  transactions.sort((a, b) => a.date - b.date)
  return transactions
}
