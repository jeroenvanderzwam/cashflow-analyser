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
  INVESTEREN:      'Investeren',
  AFLOSSING:       'Extra aflossing',
  SALARIS:         'Salaris',
  TIKKIES:         'Tikkies',
  OVERIG:          'Overig',
})

export const EXPENSE_TYPE = Object.freeze({
  VAST:     'vast',
  VARIABEL: 'variabel',
  EENMALIG: 'eenmalig',
})

const TX_CLASS = Object.freeze({
  INCOME:  'income',
  EXPENSE: 'expense',
  SAVINGS: 'savings',
})

// Categories that are fixed by nature — regardless of CV
const ALWAYS_VAST = new Set([
  CATEGORY.ENERGIE, CATEGORY.ZORGVERZEKERING, CATEGORY.VERZEKERING,
  CATEGORY.BANK_ABO, CATEGORY.WONEN, CATEGORY.LIDMAATSCHAPPEN,
])

// Categories that are variable by nature — regardless of CV
const ALWAYS_VARIABEL = new Set([
  CATEGORY.BOODSCHAPPEN, CATEGORY.HORECA,
])

const CATEGORY_RULES = [
  [/spaardoel|oranje spaarrekening|toprekening/i,
   CATEGORY.SPAREN, TX_CLASS.SAVINGS],
  [/flatex bank|beleggingsrek/i,
   CATEGORY.INVESTEREN, TX_CLASS.SAVINGS],
  [/dg groep bv|geoict/i,
   CATEGORY.SALARIS, TX_CLASS.INCOME],
  [/via tikkie|via rabo betaalverzoek|via asn bank betaalverzoek|aab inz tikkie/i,
   CATEGORY.TIKKIES, TX_CLASS.EXPENSE],
  [/albert heijn|ah to go|bck\*.*ah|lidl|jumbo|plus gils|plus markt|aldi|hoogvliet|bakker bart|dirk van den broek|spar |zwerwers|ekoplaza|biologisch/i,
   CATEGORY.BOODSCHAPPEN, TX_CLASS.EXPENSE],
  [/greenchoice|vattenfall|eneco|nuon|vitens|dunea|oxxio/i,
   CATEGORY.ENERGIE, TX_CLASS.EXPENSE],
  [/zilveren kruis|cz groep|czgroep|menzis|vgz|ditzo|zorgverzeker/i,
   CATEGORY.ZORGVERZEKERING, TX_CLASS.EXPENSE],
  [/nn schadeverzekering|centraal beheer|fbto|ing verzekeren|reaal|univé|nationale.nederlanden/i,
   CATEGORY.VERZEKERING, TX_CLASS.EXPENSE],
  [/ing hypotheken|hypotheek|vve |huurpenning|woningcorporati/i,
   CATEGORY.WONEN, TX_CLASS.EXPENSE],
  [/kosten oranjepakket|ing bank|kpn|t-mobile|vodafone libertel|vodafone|ziggo|netflix|spotify|strato|online\.nl|xs4all|tele2|sim only/i,
   CATEGORY.BANK_ABO, TX_CLASS.EXPENSE],
  [/ns groep|ov-chipkaart|translink|shell |bp |total |tamoil|tinq|gulf|esso |brandstof|parkeer|q-park|yellowbrick|msp parking/i,
   CATEGORY.VERVOER, TX_CLASS.EXPENSE],
  [/n\.v\.v\.|natuurmonumenten|stichting vrijdag|vrijdag|vereniging eigen huis|museumkaart|greenpeace|amnesty|wwf |anwb /i,
   CATEGORY.LIDMAATSCHAPPEN, TX_CLASS.EXPENSE],
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

      if (category === CATEGORY.TIKKIES && tx.direction === 'credit') {
        tx.transactionClass = TX_CLASS.INCOME
      } else {
        tx.transactionClass = txClass
      }

      if (category === CATEGORY.WONEN &&
          /hypotheek|ing hypotheken/i.test(target) &&
          tx.mutationType !== 'Incasso') {
        tx.category = CATEGORY.AFLOSSING
        tx.transactionClass = TX_CLASS.SAVINGS
      }

      return
    }
  }

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
  const monthSets = new Map()

  for (const tx of transactions) {
    if (tx.transactionClass === TX_CLASS.SAVINGS) continue
    if (tx.category === CATEGORY.TIKKIES) continue
    const key = tx.year + '|' + tx.transactionClass + '|' + normaliseKey(tx.name)
    if (!monthSets.has(key)) monthSets.set(key, new Set())
    monthSets.get(key).add(tx.month)
  }

  for (const tx of transactions) {
    if (tx.transactionClass === TX_CLASS.SAVINGS || tx.category === CATEGORY.TIKKIES) {
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
// Expense type assignment (vast / variabel / eenmalig)
// Uses category overrides first, then coefficient of variation for ambiguous cases
// ---------------------------------------------------------------------------

function assignExpenseTypes(transactions) {
  const expenses = transactions.filter(t => t.transactionClass === TX_CLASS.EXPENSE)

  // Build monthly totals per merchant group to calculate CV
  // key: "year|recurringKey" → Map<month, totalAmount>
  const monthlyTotals = new Map()
  for (const tx of expenses) {
    if (!tx.isRecurring) continue
    const key = tx.year + '|' + tx.recurringKey
    if (!monthlyTotals.has(key)) monthlyTotals.set(key, new Map())
    const m = monthlyTotals.get(key)
    m.set(tx.month, (m.get(tx.month) || 0) + tx.amount)
  }

  // Calculate coefficient of variation (stddev / mean) per group
  const cvMap = new Map()
  for (const [key, monthMap] of monthlyTotals) {
    const amounts = Array.from(monthMap.values())
    if (amounts.length < 2) { cvMap.set(key, 1); continue }
    const mean   = amounts.reduce((s, v) => s + v, 0) / amounts.length
    const stddev = Math.sqrt(amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / amounts.length)
    cvMap.set(key, mean > 0 ? stddev / mean : 1)
  }

  for (const tx of expenses) {
    if (!tx.isRecurring) {
      tx.expenseType = EXPENSE_TYPE.EENMALIG
      continue
    }
    if (ALWAYS_VAST.has(tx.category)) {
      tx.expenseType = EXPENSE_TYPE.VAST
      continue
    }
    if (ALWAYS_VARIABEL.has(tx.category)) {
      tx.expenseType = EXPENSE_TYPE.VARIABEL
      continue
    }
    // Ambiguous category: use CV (threshold 0.2)
    const cv = cvMap.get(tx.year + '|' + tx.recurringKey) ?? 1
    tx.expenseType = cv < 0.2 ? EXPENSE_TYPE.VAST : EXPENSE_TYPE.VARIABEL
  }

  // Non-expenses have no expenseType
  for (const tx of transactions) {
    if (tx.transactionClass !== TX_CLASS.EXPENSE) tx.expenseType = null
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

  const recurringIncome = income.filter(t => t.category === CATEGORY.SALARIS)
  const oneOffIncome    = income.filter(t => t.category !== CATEGORY.SALARIS)

  const vast     = expenses.filter(t => t.expenseType === EXPENSE_TYPE.VAST)
  const variabel = expenses.filter(t => t.expenseType === EXPENSE_TYPE.VARIABEL)
  const eenmalig = expenses.filter(t => t.expenseType === EXPENSE_TYPE.EENMALIG)
    .sort((a, b) => b.amount - a.amount)

  const regularSavingsOut = savings.filter(t => t.category === CATEGORY.SPAREN && t.direction === 'debit')
  const regularSavingsIn  = savings.filter(t => t.category === CATEGORY.SPAREN && t.direction === 'credit')
  const investments       = savings.filter(t => t.category === CATEGORY.INVESTEREN)
  const repayments        = savings.filter(t => t.category === CATEGORY.AFLOSSING)

  const totalIncome           = sumAmounts(income)
  const totalStructuralIncome = sumAmounts(recurringIncome)
  const totalOneOffIncome     = sumAmounts(oneOffIncome)
  const totalExpenses         = sumAmounts(expenses)
  const totalVast             = sumAmounts(vast)
  const totalVariabel         = sumAmounts(variabel)
  const totalOneOff           = sumAmounts(eenmalig)
  const totalSavings          = sumAmounts(regularSavingsOut) - sumAmounts(regularSavingsIn)
  const totalInvestments      = sumAmounts(investments)
  const totalRepayments       = sumAmounts(repayments)

  return {
    year,
    month,
    label: MONTH_NAMES[month - 1] + ' ' + year,
    totalIncome,
    totalStructuralIncome,
    totalOneOffIncome,
    totalExpenses,
    totalVast,
    totalVariabel,
    totalOneOff,
    totalSavings,
    totalInvestments,
    totalRepayments,
    netBalance: totalIncome - totalExpenses,
    recurringIncome,
    oneOffIncome,
    vastExpenses:     groupByCategory(vast),
    variabelExpenses: groupByCategory(variabel),
    oneOffExpenses:   eenmalig,
    savingsTransfers: savings,
  }
}

function buildMonthlyOverviews(txs, year) {
  const months = [...new Set(txs.map(t => t.month))].sort((a, b) => a - b)
  return months.map(month =>
    buildOneMonth(txs.filter(t => t.month === month), year, month)
  )
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function analyse(transactions) {
  transactions.forEach(categorise)
  detectRecurring(transactions)
  assignExpenseTypes(transactions)

  const years = [...new Set(transactions.map(t => t.year))].sort((a, b) => a - b)

  return years.map(year => {
    const yearTxs = transactions.filter(t => t.year === year)
    const months  = buildMonthlyOverviews(yearTxs, year)

    const totalIncome           = months.reduce((s, m) => s + m.totalIncome, 0)
    const totalStructuralIncome = months.reduce((s, m) => s + m.totalStructuralIncome, 0)
    const totalOneOffIncome     = months.reduce((s, m) => s + m.totalOneOffIncome, 0)
    const totalExpenses         = months.reduce((s, m) => s + m.totalExpenses, 0)
    const totalVast             = months.reduce((s, m) => s + m.totalVast, 0)
    const totalVariabel         = months.reduce((s, m) => s + m.totalVariabel, 0)
    const totalOneOff           = months.reduce((s, m) => s + m.totalOneOff, 0)
    const totalSavings          = months.reduce((s, m) => s + m.totalSavings, 0)
    const totalInvestments      = months.reduce((s, m) => s + m.totalInvestments, 0)
    const totalRepayments       = months.reduce((s, m) => s + m.totalRepayments, 0)

    const allVastTxs         = months.flatMap(m => m.vastExpenses.flatMap(b => b.transactions))
    const allVariabelTxs     = months.flatMap(m => m.variabelExpenses.flatMap(b => b.transactions))
    const allOneOffTxs       = months.flatMap(m => m.oneOffExpenses)
    const allRecurringIncome = months.flatMap(m => m.recurringIncome)
    const allOneOffIncome    = months.flatMap(m => m.oneOffIncome)
    const allSavings         = months.flatMap(m => m.savingsTransfers)

    return {
      year,
      totalIncome,
      totalStructuralIncome,
      totalOneOffIncome,
      totalExpenses,
      totalVast,
      totalVariabel,
      totalOneOff,
      totalSavings,
      totalInvestments,
      totalRepayments,
      netBalance: totalIncome - totalExpenses,
      months,
      vastExpenses:     groupByCategory(allVastTxs),
      variabelExpenses: groupByCategory(allVariabelTxs),
      oneOffExpenses:   allOneOffTxs.sort((a, b) => b.amount - a.amount),
      recurringIncome:  allRecurringIncome,
      oneOffIncome:     allOneOffIncome,
      savingsTransfers: allSavings,
    }
  })
}
