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
  BELASTINGEN:     'Gemeentelijke belastingen',
  VRIJE_TIJD:      'Vrije tijd',
  REIZEN:          'Reizen & verblijf',
  SPORT_FITNESS:   'Sport & fitness',
  ONLINE_WINKELEN: 'Online winkelen',
  KLEDING:         'Kleding & mode',
  HUIS_TUIN:       'Huis & tuin',
  GEZONDHEID:      'Gezondheid & verzorging',
  OVERIG:          'Overig',
})

export const EXPENSE_TYPE = Object.freeze({
  VAST:     'vast',
  VARIABEL: 'variabel',
})

const TX_CLASS = Object.freeze({
  INCOME:  'income',
  EXPENSE: 'expense',
  SAVINGS: 'savings',
})

// Default transaction class per category (used for custom merchant mappings)
const CATEGORY_TX_CLASS = {
  [CATEGORY.SPAREN]:    'savings',
  [CATEGORY.INVESTEREN]: 'savings',
  [CATEGORY.AFLOSSING]: 'savings',
  [CATEGORY.SALARIS]:   'income',
}

// Categories that are fixed by nature — regardless of CV
const ALWAYS_VAST = new Set([
  CATEGORY.ENERGIE, CATEGORY.ZORGVERZEKERING, CATEGORY.VERZEKERING,
  CATEGORY.BANK_ABO, CATEGORY.WONEN, CATEGORY.LIDMAATSCHAPPEN,
  CATEGORY.BELASTINGEN, CATEGORY.VERVOER,
])

// Categories that are variable by nature — regardless of CV
const ALWAYS_VARIABEL = new Set([
  CATEGORY.BOODSCHAPPEN, CATEGORY.HORECA,
  CATEGORY.VRIJE_TIJD, CATEGORY.REIZEN, CATEGORY.SPORT_FITNESS,
  CATEGORY.ONLINE_WINKELEN, CATEGORY.KLEDING, CATEGORY.HUIS_TUIN,
  CATEGORY.GEZONDHEID,
])

const CATEGORY_RULES = [
  [/spaardoel|oranje spaarrekening|toprekening/i,
   CATEGORY.SPAREN, TX_CLASS.SAVINGS],
  [/flatex bank|beleggingsrek/i,
   CATEGORY.INVESTEREN, TX_CLASS.SAVINGS],
  [/dg groep bv|geoict/i,
   CATEGORY.SALARIS, TX_CLASS.INCOME],
  [/belastingkantoor|gem.*belast|aanslagbiljet/i,
   CATEGORY.BELASTINGEN, TX_CLASS.EXPENSE],
  [/via tikkie|via rabo betaalverzoek|via asn bank betaalverzoek|aab inz tikkie/i,
   CATEGORY.TIKKIES, TX_CLASS.EXPENSE],
  [/albert heijn|ah to go|bck\*.*ah|lidl|jumbo|plus gils|plus markt|aldi|hoogvliet|bakker bart|dirk van den broek|spar |zwerwers|ekoplaza|biologisch/i,
   CATEGORY.BOODSCHAPPEN, TX_CLASS.EXPENSE],
  [/greenchoice|vattenfall|eneco|nuon|vitens|dunea|oxxio|waterbedrijf/i,
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
  [/ccv\*|zettle\*|square \*|restaurant|brasserie|bistro|pannekoek|pizzeria|sushi|kebab|wereldburger|cafetaria|snackbar|takeaway|deliveroo|thuisbezorgd|uber eats|domino|new york pizza|kantine|starbucks|mcdonald|burger.?king|subway\b|kfc\b|five guys|koffie|coffee|lunchroom|lunchcafe|bakkerij|patisserie|ijssalon/i,
   CATEGORY.HORECA, TX_CLASS.EXPENSE],
  [/efteling|pretpark|dierentuin|\bzoo\b|kinepolis|pathe\b|bioscoop|cinema|theater|theatre|\bconcert\b|festival|attractie|evenement/i,
   CATEGORY.VRIJE_TIJD, TX_CLASS.EXPENSE],
  [/hotel|hostel|camping|kampeer|bungalow|vakantiepark|\bresort\b|airbnb|stayokay|roompot/i,
   CATEGORY.REIZEN, TX_CLASS.EXPENSE],
  [/basic.?fit|fitness|sportschool|sportclub|sportver|zwembad|tennisclub|voetbalver|hockeyclub|handbalver|\bpadel\b|\bsquash\b|\byoga\b|pilates/i,
   CATEGORY.SPORT_FITNESS, TX_CLASS.EXPENSE],
  [/bol\.com|coolblue|amazon|azerty|bax.shop|mediamarkt|wehkamp|zalando/i,
   CATEGORY.ONLINE_WINKELEN, TX_CLASS.EXPENSE],
  [/h&m\b|\bzara\b|c&a\b|primark|scapino|we fashion|zeeman|jack.jones|\bmango\b|vero moda|esprit/i,
   CATEGORY.KLEDING, TX_CLASS.EXPENSE],
  [/\bikea\b|hornbach|\bgamma\b|\bkarwei\b|\bpraxis\b|intratuin|leen bakker|kwantum|\bxenos\b|\bblokker\b/i,
   CATEGORY.HUIS_TUIN, TX_CLASS.EXPENSE],
  [/apotheek|drogist|kruidvat|\betos\b|kapper|kappers|tandarts|huisarts|fysiother|opticien|brillen|thermen|wellness|\bsauna\b/i,
   CATEGORY.GEZONDHEID, TX_CLASS.EXPENSE],
]

// ---------------------------------------------------------------------------
// Categorisation
// ---------------------------------------------------------------------------

function categorise(tx, customCategories) {
  // User-defined merchant overrides take priority
  const custom = customCategories?.[tx.nameLower]
  if (custom) {
    tx.category = custom
    tx.transactionClass = CATEGORY_TX_CLASS[custom] ?? TX_CLASS.EXPENSE
    return
  }

  const target = tx.nameLower + ' ' + tx.description.toLowerCase()

  for (const [regex, category, txClass] of CATEGORY_RULES) {
    if (regex.test(target)) {
      tx.category = category

      if (category === CATEGORY.TIKKIES && tx.direction === 'credit') {
        tx.transactionClass = TX_CLASS.INCOME
      } else if (category === CATEGORY.BELASTINGEN && tx.direction === 'credit') {
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
// Expense type assignment (vast / variabel)
// Uses category overrides first, then coefficient of variation for ambiguous cases
// ---------------------------------------------------------------------------

function assignExpenseTypes(transactions) {
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
    if (ALWAYS_VAST.has(tx.category)) {
      tx.expenseType = EXPENSE_TYPE.VAST
      continue
    }
    if (ALWAYS_VARIABEL.has(tx.category)) {
      tx.expenseType = EXPENSE_TYPE.VARIABEL
      continue
    }
    if (!tx.isRecurring) {
      tx.expenseType = EXPENSE_TYPE.VARIABEL
      continue
    }
    // Ambiguous category: use cross-year CV (threshold 0.3)
    const cv = cvMap.get(tx.recurringKey) ?? 1
    tx.expenseType = cv < 0.3 ? EXPENSE_TYPE.VAST : EXPENSE_TYPE.VARIABEL
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

export function analyse(transactions, customCategories = {}) {
  // Normalise keys to lowercase for case-insensitive matching
  const normCustom = Object.fromEntries(
    Object.entries(customCategories).map(([k, v]) => [k.toLowerCase(), v])
  )
  transactions.forEach(tx => categorise(tx, normCustom))
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
