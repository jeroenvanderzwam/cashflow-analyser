/**
 * analyser.js — Categorisation, recurring detection, monthly/yearly aggregation.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY = Object.freeze({
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
  SALARIS:         'Salaris',
  TIKKIES:         'Tikkies',
  OVERIG:          'Overig',
});

const TX_CLASS = Object.freeze({
  INCOME:  'income',
  EXPENSE: 'expense',
  SAVINGS: 'savings',
});

/**
 * Categorisation rules — evaluated top-to-bottom, first match wins.
 * Each entry: [regex, category, transactionClass]
 * Tested against: tx.nameLower + ' ' + tx.description.toLowerCase()
 *
 * NOTE: savings/income rules come first to avoid misclassification.
 */
const CATEGORY_RULES = [
  // --- SAVINGS (catches both debit and credit directions) ---
  [/spaardoel|oranje spaarrekening|flatex bank/i,
   CATEGORY.SPAREN, TX_CLASS.SAVINGS],

  // --- INCOME: salary from employer ---
  [/dg groep bv/i,
   CATEGORY.SALARIS, TX_CLASS.INCOME],

  // --- TIKKIES: handled below in categorise() with direction check ---
  // AAB INZ TIKKIE credit = reimbursement (income), debit = shouldn't happen
  // "X via Tikkie" debit = you paying someone
  [/via tikkie|via rabo betaalverzoek|via asn bank betaalverzoek|aab inz tikkie/i,
   CATEGORY.TIKKIES, TX_CLASS.EXPENSE],  // direction override applied in categorise()

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
];

// ---------------------------------------------------------------------------
// Categorisation
// ---------------------------------------------------------------------------

/**
 * Assign category and transactionClass to a single transaction.
 * Mutates tx in place.
 * @param {Transaction} tx
 */
function categorise(tx) {
  const target = tx.nameLower + ' ' + tx.description.toLowerCase();

  for (const [regex, category, txClass] of CATEGORY_RULES) {
    if (regex.test(target)) {
      tx.category = category;

      // Special case: Tikkie credit (AAB INZ TIKKIE) = incoming reimbursement
      if (category === CATEGORY.TIKKIES && tx.direction === 'credit') {
        tx.transactionClass = TX_CLASS.INCOME;
      } else {
        tx.transactionClass = txClass;
      }

      // Savings credits (withdrawal from savings) keep savings class
      return;
    }
  }

  // Fallback
  if (tx.direction === 'credit') {
    tx.category = CATEGORY.OVERIG;
    tx.transactionClass = TX_CLASS.INCOME;
  } else {
    tx.category = CATEGORY.OVERIG;
    tx.transactionClass = TX_CLASS.EXPENSE;
  }
}

// ---------------------------------------------------------------------------
// Recurring detection
// ---------------------------------------------------------------------------

/**
 * Normalise a merchant name into a stable grouping key.
 * Collapses variants like "ALBERT HEIJN 1206 GRONINGEN NLD" and
 * "ALBERT HEIJN 1308 UTRECHT NLD" → "albert heijn".
 * @param {string} name
 * @returns {string}
 */
function normaliseKey(name) {
  return name
    .toLowerCase()
    // Strip payment terminal prefixes
    .replace(/^(ccv|zettle|square|bcm|bck)\*[^\s]*\s*/i, '')
    // Strip country codes at end
    .replace(/\s+(nld|deu|gbr|fra|bel|usa|prt|esp|ita)\s*$/i, '')
    // Strip store/branch numbers (3+ digits surrounded by spaces or at end)
    .replace(/\s+\d{3,}\s*/g, ' ')
    // Strip city names that appear to follow the actual name (ALL CAPS city)
    .replace(/\s+[A-Z]{3,}(\s+[A-Z]{3,})*\s*$/, '')
    // Strip "IZ" routing words common in NL banking ("NS GROEP IZ NS REIZIGERS")
    // Keep as-is for now, full name is fine for grouping
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect recurring transactions.
 * Groups expense transactions by (year, normaliseKey(name)).
 * If a key appears in ≥3 distinct months within that year → isRecurring = true.
 * Mutates transactions in place.
 * @param {Transaction[]} transactions
 */
function detectRecurring(transactions) {
  // Map: "2025|albert heijn" → Set of month numbers
  /** @type {Map<string, Set<number>>} */
  const monthSets = new Map();

  for (const tx of transactions) {
    if (tx.transactionClass !== TX_CLASS.EXPENSE) continue;
    const key = tx.year + '|' + normaliseKey(tx.name);
    tx.recurringKey = key;
    if (!monthSets.has(key)) monthSets.set(key, new Set());
    monthSets.get(key).add(tx.month);
  }

  for (const tx of transactions) {
    if (tx.transactionClass !== TX_CLASS.EXPENSE) {
      tx.isRecurring = false;
      tx.recurringKey = '';
      continue;
    }
    const key = tx.year + '|' + normaliseKey(tx.name);
    tx.recurringKey = normaliseKey(tx.name); // store without year prefix
    tx.isRecurring = (monthSets.get(key)?.size ?? 0) >= 3;
  }
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

/** @param {Transaction[]} txs */
function sumAmounts(txs) {
  return txs.reduce((s, t) => s + t.amount, 0);
}

/**
 * Group transactions by category, sorted by total descending.
 * @param {Transaction[]} txs
 * @returns {CategoryBreakdown[]}
 */
function groupByCategory(txs) {
  /** @type {Map<string, Transaction[]>} */
  const map = new Map();
  for (const tx of txs) {
    if (!map.has(tx.category)) map.set(tx.category, []);
    map.get(tx.category).push(tx);
  }
  return Array.from(map.entries())
    .map(([category, transactions]) => ({
      category,
      transactions,
      total: sumAmounts(transactions),
    }))
    .sort((a, b) => b.total - a.total);
}

const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

/**
 * Build a MonthlyOverview for the given transactions (all from same year+month).
 * @param {Transaction[]} txs
 * @param {number} year
 * @param {number} month 1–12
 * @returns {MonthlyOverview}
 */
function buildOneMonth(txs, year, month) {
  const income   = txs.filter(t => t.transactionClass === TX_CLASS.INCOME);
  const savings  = txs.filter(t => t.transactionClass === TX_CLASS.SAVINGS);
  const expenses = txs.filter(t => t.transactionClass === TX_CLASS.EXPENSE);

  const recurring = expenses.filter(t => t.isRecurring);
  const oneOff    = expenses.filter(t => !t.isRecurring)
    .sort((a, b) => b.amount - a.amount);

  const salary    = income.filter(t => t.category === CATEGORY.SALARIS);
  const otherInc  = income.filter(t => t.category !== CATEGORY.SALARIS);

  const savingsOut = savings.filter(t => t.direction === 'debit');

  const totalIncome   = sumAmounts(income);
  const totalExpenses = sumAmounts(expenses);
  const totalSavings  = sumAmounts(savingsOut);

  return {
    year,
    month,
    label: MONTH_NAMES[month - 1] + ' ' + year,
    totalIncome,
    totalExpenses,
    totalSavings,
    netBalance: totalIncome - totalExpenses - totalSavings,
    salaryTransactions: salary,
    otherIncome:        otherInc,
    recurringExpenses:  groupByCategory(recurring),
    oneOffExpenses:     oneOff,
    savingsTransfers:   savings,
  };
}

/**
 * Build MonthlyOverview[] for one year.
 * Produces an entry for every month in the data (not necessarily all 12).
 * @param {Transaction[]} txs - All transactions for this year
 * @param {number} year
 * @returns {MonthlyOverview[]}
 */
function buildMonthlyOverviews(txs, year) {
  // Find which months have data
  const months = [...new Set(txs.map(t => t.month))].sort((a, b) => a - b);
  return months.map(month => {
    const monthTxs = txs.filter(t => t.month === month);
    return buildOneMonth(monthTxs, year, month);
  });
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Run the full analysis pipeline on a mixed set of transactions from any years.
 * @param {Transaction[]} transactions - Output of parseCSV() (one or more files merged)
 * @returns {YearlyOverview[]} Sorted ascending by year
 */
function analyse(transactions) {
  // Step 1: categorise
  transactions.forEach(categorise);

  // Step 2: detect recurring (per year)
  detectRecurring(transactions);

  // Step 3: group by year
  const years = [...new Set(transactions.map(t => t.year))].sort((a, b) => a - b);

  return years.map(year => {
    const yearTxs = transactions.filter(t => t.year === year);
    const months  = buildMonthlyOverviews(yearTxs, year);

    const income   = yearTxs.filter(t => t.transactionClass === TX_CLASS.INCOME);
    const expenses = yearTxs.filter(t => t.transactionClass === TX_CLASS.EXPENSE);
    const savingsOut = yearTxs.filter(t => t.transactionClass === TX_CLASS.SAVINGS && t.direction === 'debit');

    const totalIncome   = sumAmounts(income);
    const totalExpenses = sumAmounts(expenses);
    const totalSavings  = sumAmounts(savingsOut);

    return {
      year,
      totalIncome,
      totalExpenses,
      totalSavings,
      netBalance: totalIncome - totalExpenses - totalSavings,
      months,
    };
  });
}
