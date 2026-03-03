/**
 * analyser.js — Categorisation, recurring detection, monthly/yearly aggregation.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------


const TX_CLASS = Object.freeze({
  INCOME:  'income',
  EXPENSE: 'expense',
  SAVINGS: 'savings',
})

// Default transaction class per category (used for custom merchant mappings)
const CATEGORY_TX_CLASS = {
  'Sparen':          'savings',
  'Beleggen':      'savings',
  'Extra aflossing': 'savings',
  'Salaris':         'income',
}

// ---------------------------------------------------------------------------
// Config parsing — supports {merchants, rules}
// and the old flat {name: category} format for backwards compatibility
// ---------------------------------------------------------------------------

function parseConfig(raw) {
  if (raw.merchants || raw.rules) {
    return {
      merchants: raw.merchants ?? {},
      rules:     raw.rules     ?? [],
    }
  }
  // Backwards compat: old flat merchant map
  return { merchants: raw, rules: [] }
}

function compileRules(rules) {
  return rules.map(r => [
    new RegExp(r.pattern, 'i'),
    r.category,
    r.type === 'income'  ? TX_CLASS.INCOME  :
    r.type === 'savings' ? TX_CLASS.SAVINGS :
                           TX_CLASS.EXPENSE,
    (r.type === 'vast' || r.type === 'variabel') ? r.type : null,
  ])
}

// ---------------------------------------------------------------------------
// Categorisation
// ---------------------------------------------------------------------------

function applyRule(tx, category, txClass) {
  tx.category = category
  // Credits on expense categories are refunds → income
  tx.transactionClass = (txClass === TX_CLASS.EXPENSE && tx.direction === 'credit')
    ? TX_CLASS.INCOME
    : txClass

  if (category === 'Wonen' &&
      /hypotheek|ing hypotheken/i.test(tx.nameLower + ' ' + tx.description.toLowerCase()) &&
      tx.mutationType !== 'Incasso') {
    tx.category = 'Extra aflossing'
    tx.transactionClass = TX_CLASS.SAVINGS
  }
}

function categorise(tx, merchants, allRules) {
  // 1. Exact merchant override — highest priority
  const custom = merchants?.[tx.nameLower]
  if (custom) {
    tx.category = custom
    const customClass = CATEGORY_TX_CLASS[custom] ?? TX_CLASS.EXPENSE
    tx.transactionClass = (customClass === TX_CLASS.EXPENSE && tx.direction === 'credit')
      ? TX_CLASS.INCOME
      : customClass
    return
  }

  const target = tx.nameLower + ' ' + tx.description.toLowerCase()

  // 2. Rules (config-supplied or built-in fallback, decided in analyse())
  for (const [regex, category, txClass] of allRules) {
    if (regex.test(target)) { applyRule(tx, category, txClass); return }
  }

  // 3. Fallback
  tx.category = 'Overig'
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
    if (tx.category === 'Tikkies') continue
    const key = tx.year + '|' + tx.transactionClass + '|' + normaliseKey(tx.name)
    if (!monthSets.has(key)) monthSets.set(key, new Set())
    monthSets.get(key).add(tx.month)
  }

  for (const tx of transactions) {
    if (tx.transactionClass === TX_CLASS.SAVINGS || tx.category === 'Tikkies') {
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
// Expense type assignment (vast / variabel)
// Uses category overrides first, then coefficient of variation for ambiguous cases
// ---------------------------------------------------------------------------

function assignExpenseTypes(transactions, categoryTypeMap) {
  const expenses = transactions.filter(t => t.transactionClass === TX_CLASS.EXPENSE)

  // Build monthly totals per merchant group to calculate CV (cross-year)
  // key: recurringKey → Map<"year-month", totalAmount>
  const monthlyTotals = new Map()
  for (const tx of expenses) {
    if (!tx.isRecurring) continue
    const key = tx.recurringKey
    if (!monthlyTotals.has(key)) monthlyTotals.set(key, new Map())
    const m = monthlyTotals.get(key)
    const monthKey = tx.year + '-' + tx.month
    m.set(monthKey, (m.get(monthKey) || 0) + tx.amount)
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
    const fixedType = categoryTypeMap.get(tx.category)
    if (fixedType) {
      tx.expenseType = fixedType
      continue
    }
    if (!tx.isRecurring) {
      tx.expenseType = 'variabel'
      continue
    }
    // Ambiguous category: use cross-year CV (threshold 0.3)
    const cv = cvMap.get(tx.recurringKey) ?? 1
    tx.expenseType = cv < 0.3 ? 'vast' : 'variabel'
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

  const recurringIncome = income.filter(t => t.category === 'Salaris')
  const oneOffIncome    = income.filter(t => t.category !== 'Salaris')

  const vast     = expenses.filter(t => t.expenseType === 'vast')
  const variabel = expenses.filter(t => t.expenseType === 'variabel')

  const regularSavingsOut = savings.filter(t => t.category === 'Sparen' && t.direction === 'debit')
  const regularSavingsIn  = savings.filter(t => t.category === 'Sparen' && t.direction === 'credit')
  const investOut         = savings.filter(t => t.category === 'Beleggen' && t.direction === 'debit')
  const investIn          = savings.filter(t => t.category === 'Beleggen' && t.direction === 'credit')
  const repOut            = savings.filter(t => t.category === 'Extra aflossing' && t.direction === 'debit')
  const repIn             = savings.filter(t => t.category === 'Extra aflossing' && t.direction === 'credit')

  const totalIncome           = sumAmounts(income)
  const totalStructuralIncome = sumAmounts(recurringIncome)
  const totalOneOffIncome     = sumAmounts(oneOffIncome)
  const totalExpenses         = sumAmounts(expenses)
  const totalVast             = sumAmounts(vast)
  const totalVariabel         = sumAmounts(variabel)
  const totalSavings          = sumAmounts(regularSavingsOut) - sumAmounts(regularSavingsIn)
  const totalInvestments      = sumAmounts(investOut) - sumAmounts(investIn)
  const totalRepayments       = sumAmounts(repOut) - sumAmounts(repIn)

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
    totalSavings,
    totalInvestments,
    totalRepayments,
    netBalance: totalIncome - totalExpenses,
    recurringIncome,
    oneOffIncome,
    vastExpenses:     groupByCategory(vast),
    variabelExpenses: groupByCategory(variabel),
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

export function analyse(transactions, rawConfig = {}) {
  const { merchants, rules } = parseConfig(rawConfig)
  const normMerchants = Object.fromEntries(
    Object.entries(merchants).map(([k, v]) => [k.toLowerCase(), v])
  )
  const allRules        = compileRules(rules)
  const categoryTypeMap = new Map(allRules.filter(r => r[3]).map(r => [r[1], r[3]]))
  transactions.forEach(tx => categorise(tx, normMerchants, allRules))
  detectRecurring(transactions)
  assignExpenseTypes(transactions, categoryTypeMap)

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
    const totalSavings          = months.reduce((s, m) => s + m.totalSavings, 0)
    const totalInvestments      = months.reduce((s, m) => s + m.totalInvestments, 0)
    const totalRepayments       = months.reduce((s, m) => s + m.totalRepayments, 0)

    const allVastTxs         = months.flatMap(m => m.vastExpenses.flatMap(b => b.transactions))
    const allVariabelTxs     = months.flatMap(m => m.variabelExpenses.flatMap(b => b.transactions))
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
      totalSavings,
      totalInvestments,
      totalRepayments,
      netBalance: totalIncome - totalExpenses,
      months,
      vastExpenses:     groupByCategory(allVastTxs),
      variabelExpenses: groupByCategory(allVariabelTxs),
      recurringIncome:  allRecurringIncome,
      oneOffIncome:     allOneOffIncome,
      savingsTransfers: allSavings,
    }
  })
}
