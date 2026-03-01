/**
 * parser.js — ING CSV → Transaction[]
 * Knows only about ING's file format, nothing about business logic.
 */

/**
 * Parse a Dutch decimal string to a JS number.
 * "1.234,56" → 1234.56
 * @param {string} s
 * @returns {number}
 */
function parseAmount(s) {
  return parseFloat(s.replace(/\./g, '').replace(',', '.'));
}

/**
 * Parse ING date string "YYYYMMDD" to a Date (noon UTC to avoid DST shifts).
 * @param {string} s
 * @returns {Date}
 */
function parseDate(s) {
  const y = parseInt(s.slice(0, 4), 10);
  const m = parseInt(s.slice(4, 6), 10) - 1; // 0-indexed
  const d = parseInt(s.slice(6, 8), 10);
  return new Date(Date.UTC(y, m, d, 12, 0, 0));
}

/**
 * Split one ING CSV line into 11 fields.
 * ING wraps every field in double quotes; semicolons separate fields.
 * Fields never contain semicolons, so a simple split works.
 * @param {string} line
 * @returns {string[]} 11 fields, quotes stripped
 */
function parseLine(line) {
  return line.split(';').map(f => f.replace(/^"|"$/g, '').trim());
}

/**
 * Parse a full ING CSV export (UTF-8 text) into an array of Transactions.
 * Returns transactions sorted oldest-first.
 *
 * @param {string} csvText
 * @returns {Transaction[]}
 */
function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  // Skip header row
  const dataLines = lines.slice(1);
  const transactions = [];

  dataLines.forEach((line, index) => {
    const fields = parseLine(line);
    if (fields.length < 10) return; // skip malformed lines

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
      // tag            // 10 Tag — always empty, ignored
    ] = fields;

    const date = parseDate(datum);

    /** @type {Transaction} */
    const tx = {
      id:             datum + '-' + index,
      date:           date,
      year:           date.getUTCFullYear(),
      month:          date.getUTCMonth() + 1,
      name:           naam,
      nameLower:      naam.toLowerCase(),
      account:        rekening,
      counterAccount: tegenrekening,
      code:           code,
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
    };

    transactions.push(tx);
  });

  // Sort oldest first
  transactions.sort((a, b) => a.date - b.date);

  return transactions;
}
