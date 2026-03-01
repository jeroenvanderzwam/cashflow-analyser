/**
 * analyser.js — Categorisation, recurring detection, monthly/yearly aggregation.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CATEGORY = Object.freeze({
  BOODSCHAPPEN:    'Boodschappen',
  ENERGIE:         'Energie',
  ZORGVERZEKERING: 'Zorgverzekering',
  VERZEKERING:     'Verzekering',
  BANK_ABO:        'Bank & Abonnementen',
  VERVOER:         'Vervoer',
  LIDMAATSCHAPPEN: 'Lidmaatschappen',
  HORECA:          'Horeca',
  WONEN:           'Wonen',
  SPAREN:          'Sparen',
  AFLOSSING:       'Extra aflossing',
  SALARIS:         'Salaris',
  TIKKIES:         'Tikkies',
  OVERIG:          'Overig',
})

const TX_CLASS = Object.freeze({
  INCOME:  'income',
  EXPENSE: 'expense',
  SAVINGS: 'savings',
})

/**
 * Categorisation rules — evaluated top-to-bottom, first match wins.
 * Each entry: [regex, category, transactionClass]
 * Tested against: tx.nameLower + ' ' + tx.description.toLowerCase()
 */
const CATEGORY_RULES = [
  // --- SAVINGS (catches both debit and credit directions) ---
  [/spaardoel|oranje spaarrekening|flatex bank|toprekening/i,
   CATEGORY.SPAREN, TX_CLASS.SAVINGS],

  // --- INCOME: salary from employer ---
  [/dg groep bv/i,
   CATEGORY.SALARIS, TX_CLASS.INCOME],

  // --- TIKKIES: direction override applied in categorise() ---
  [/via tikkie|via rabo betaalverzoek|via asn bank betaalverzoek|aab inz tikkie/i,
   CATEGORY.TIKKIES, TX_CLASS.EXPENSE],

  // --- BOODSCHAPPEN ---
  [/albert heijn|ah to go|bck\*.*ah|lidl|jumbo|plus gils|plus markt|aldi|hoogvliet|bakker bart|dirk van den broek|spar |zwerwers|ekoplaza|biologisch/i,
   CATEGORY.BOODSCHAPPEN, TX_CLASS.EXPENSE],

  // --- ENERGIE & WATER ---
  [/greenchoice|vattenfall|eneco|nuon|vitens|dunea|oxxio/i,
   CATEGORY.ENERGIE, TX_CLASS.EXPENSE],

  // --- ZORGVERZEKERING ---
  [/zilveren kruis|cz groep|czgroep|menzis|vgz|ditzo|zorgverzeker/i,
   CATEGORY.ZORGVERZEKERING, TX_CLASS.EXPENSE],

  // --- VERZEKERING (niet zorg) ---
  [/nn schadeverzekering|centraal beheer|fbto|ing verzekeren|reaal|univé|nationale.nederlanden/i,
   CATEGORY.VERZEKERING, TX_CLASS.EXPENSE],

  // --- WONEN (hypotheek, VvE, huur) ---
  [/ing hypotheken|hypotheek|vve |huurpenning|woningcorporati/i,
   CATEGORY.WONEN, TX_CLASS.EXPENSE],

  // --- BANK & ABONNEMENTEN ---
  [/kosten oranjepakket|ing bank|kpn|t-mobile|vodafone libertel|vodafone|ziggo|netflix|spotify|strato|online\.nl|xs4all|tele2|sim only/i,
   CATEGORY.BANK_ABO, TX_CLASS.EXPENSE],

  // --- VERVOER ---
  [/ns groep|ov-chipkaart|translink|shell |bp |total |tamoil|tinq|gulf|esso |brandstof|parkeer|q-park|yellowbrick|msp parking/i,
   CATEGORY.VERVOER, TX_CLASS.EXPENSE],

  // --- LIDMAATSCHAPPEN ---
  [/n\.v\.v\.|natuurmonumenten|stichting vrijdag|vrijdag|vereniging eigen huis|museumkaart|greenpeace|amnesty|wwf |anwb /i,
   CATEGORY.LIDMAATSCHAPPEN, TX_CLASS.EXPENSE],

  // --- HORECA (restaurants, cafés, bars, delivery) ---
  [/ccv\*|zettle\*|square \*|restaurant|brasserie|bistro|pannekoek|pizzeria|sushi|kebab|wereldburger|cafetaria|snackbar|takeaway|deliveroo|thuisbezorgd|uber eats|domino|new york pizza/i,
   CATEGORY.HORECA, TX_CLASS.EXPENSE],
]

// ---------------------------------------------------------------------------
// Categorisation
// ---------------------------------------------------------------------------

function categorise(tx) {
  const target = tx.nameLower + ' ' + tx.description.toLowerCase()

  for (const [regex, category, txClass] of CATEGORY_RULES) {
    if (regex.test(target)) {
      tx.category = category

      // Special case: Tikkie credit (AAB INZ TIKKIE) = incoming reimbursement
      if (category === CATEGORY.TIKKIES && tx.direction === 'credit') {
        tx.transactionClass = TX_CLASS.INCOME
      } else {
        tx.transactionClass = txClass
      }

      // Extra mortgage repayments (manual transfers, not monthly direct debits) → aflossing
      // Regular monthly payments come in as Incasso; extra repayments as Online bankieren/Verzamelbetaling
      if (category === CATEGORY.WONEN &&
          /hypotheek|ing hypotheken/i.test(target) &&
          tx.mutationType !== 'Incasso') {
        tx.category = CATEGORY.AFLOSSING
        tx.transactionClass = TX_CLASS.SAVINGS
      }

      return
    }
  }

  // Fallback
  tx.category = CATEGORY.OVERIG
  tx.transactionClass = tx.direction === 'credit' ? TX_CLASS.INCOME : TX_CLASS.EXPENSE
}

// ---------------------------------------------------------------------------
// Recurring detection — applied to both income and expenses
// ---------------------------------------------------------------------------

function normaliseKey(name) {
  return name
    .toLowerCase()
    .replace(/^(ccv|zettle|square|bcm|bck)\*[^\s]*\s*/i, '')
    .replace(/\s+(nld|deu|gbr|fra|bel|usa|prt|esp|ita)\s*$/i, '')
    .replace(/\s+\d{3,}\s*/g, ' ')
    .replace(/\s+[A-Z]{3,}(\s+[A-Z]{3,})*\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function detectRecurring(transactions) {
  // Map: "2025|income|albert heijn" → Set of month numbers
  // Include transactionClass in key so income and expense recurring are tracked separately
  const monthSets = new Map()

  for (const tx of transactions) {
    if (tx.transactionClass === TX_CLASS.SAVINGS) continue
    const key = tx.year + '|' + tx.transactionClass + '|' + normaliseKey(tx.name)
    if (!monthSets.has(key)) monthSets.set(key, new Set())
    monthSets.get(key).add(tx.month)
  }

  for (const tx of transactions) {
    if (tx.transactionClass === TX_CLASS.SAVINGS) {
      tx.isRecurring = false
      tx.recurringKey = ''
      continue
    }
    const key = tx.year + '|' + tx.transactionClass + '|' + normaliseKey(tx.name)
    tx.recurringKey = normaliseKey(tx.name)
    tx.isRecurring = (monthSets.get(key)?.size ?? 0) >= 3
  }
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

function sumAmounts(txs) {
  return txs.reduce((s, t) => s + t.amount, 0)
}

function groupByCategory(txs) {
  const map = new Map()
  for (const tx of txs) {
    if (!map.has(tx.category)) map.set(tx.category, [])
    map.get(tx.category).push(tx)
  }
  return Array.from(map.entries())
    .map(([category, transactions]) => ({
      category,
      transactions,
      total: sumAmounts(transactions),
    }))
    .sort((a, b) => b.total - a.total)
}

export const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

function buildOneMonth(txs, year, month) {
  const income   = txs.filter(t => t.transactionClass === TX_CLASS.INCOME)
  const savings  = txs.filter(t => t.transactionClass === TX_CLASS.SAVINGS)
  const expenses = txs.filter(t => t.transactionClass === TX_CLASS.EXPENSE)

  // Income split: recurring (structural) vs one-off
  const structuralIncome = income.filter(t => t.isRecurring)
  const oneOffIncome     = income.filter(t => !t.isRecurring)

  // Expenses split: recurring vs one-off
  const recurring = expenses.filter(t => t.isRecurring)
  const oneOff    = expenses.filter(t => !t.isRecurring).sort((a, b) => b.amount - a.amount)

  const salary   = income.filter(t => t.category === CATEGORY.SALARIS)
  const otherInc = income.filter(t => t.category !== CATEGORY.SALARIS)

  // Savings split: regular savings vs extra mortgage repayments
  const regularSavingsOut = savings.filter(t => t.category === CATEGORY.SPAREN && t.direction === 'debit')
  const repayments        = savings.filter(t => t.category === CATEGORY.AFLOSSING)

  const totalIncome          = sumAmounts(income)
  const totalStructuralIncome = sumAmounts(structuralIncome)
  const totalOneOffIncome    = sumAmounts(oneOffIncome)
  const totalExpenses        = sumAmounts(expenses)
  const totalRecurring       = sumAmounts(recurring)
  const totalOneOff          = sumAmounts(oneOff)
  const totalSavings         = sumAmounts(regularSavingsOut)
  const totalRepayments      = sumAmounts(repayments)

  return {
    year,
    month,
    label: MONTH_NAMES[month - 1] + ' ' + year,
    totalIncome,
    totalStructuralIncome,
    totalOneOffIncome,
    totalExpenses,
    totalRecurring,
    totalOneOff,
    totalSavings,
    totalRepayments,
    netBalance: totalIncome - totalExpenses,
    salaryTransactions: salary,
    otherIncome:        otherInc,
    recurringExpenses:  groupByCategory(recurring),
    oneOffExpenses:     oneOff,
    savingsTransfers:   savings,
  }
}

function buildMonthlyOverviews(txs, year) {
  const months = [...new Set(txs.map(t => t.month))].sort((a, b) => a - b)
  return months.map(month => {
    const monthTxs = txs.filter(t => t.month === month)
    return buildOneMonth(monthTxs, year, month)
  })
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function analyse(transactions) {
  transactions.forEach(categorise)
  detectRecurring(transactions)

  const years = [...new Set(transactions.map(t => t.year))].sort((a, b) => a - b)

  return years.map(year => {
    const yearTxs = transactions.filter(t => t.year === year)
    const months  = buildMonthlyOverviews(yearTxs, year)

    const totalIncome           = months.reduce((s, m) => s + m.totalIncome, 0)
    const totalStructuralIncome = months.reduce((s, m) => s + m.totalStructuralIncome, 0)
    const totalOneOffIncome     = months.reduce((s, m) => s + m.totalOneOffIncome, 0)
    const totalExpenses         = months.reduce((s, m) => s + m.totalExpenses, 0)
    const totalRecurring        = months.reduce((s, m) => s + m.totalRecurring, 0)
    const totalOneOff           = months.reduce((s, m) => s + m.totalOneOff, 0)
    const totalSavings          = months.reduce((s, m) => s + m.totalSavings, 0)
    const totalRepayments       = months.reduce((s, m) => s + m.totalRepayments, 0)

    return {
      year,
      totalIncome,
      totalStructuralIncome,
      totalOneOffIncome,
      totalExpenses,
      totalRecurring,
      totalOneOff,
      totalSavings,
      totalRepayments,
      netBalance: totalIncome - totalExpenses,
      months,
    }
  })
}
