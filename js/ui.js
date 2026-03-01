/**
 * ui.js — DOM rendering and Chart.js integration.
 * Depends on: analyser.js (CATEGORY, MONTH_NAMES)
 */

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------
let _overviews         = [];   // YearlyOverview[]
let _activeYear        = null; // YearlyOverview
let _activeMonth       = null; // MonthlyOverview
let _chart             = null; // active Chart.js instance
let _specialThreshold  = 200;  // € threshold for "bijzondere uitgaven"

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** @param {number} n */
function fmt(n) {
  return '€\u00a0' + n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Truncate a string to max n characters */
function trunc(s, n = 40) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// ---------------------------------------------------------------------------
// View switching
// ---------------------------------------------------------------------------

function showView(id) {
  document.getElementById('view-multiyear').hidden = (id !== 'view-multiyear');
  document.getElementById('view-month').hidden    = (id !== 'view-year+month');

  // Year chart stays visible in both 'view-year' and 'view-year+month'
  const yearEl = document.getElementById('view-year');
  yearEl.hidden = (id === 'view-welcome' || id === 'view-multiyear');
  yearEl.classList.toggle('chart-compact', id === 'view-year+month');
}

function updateNav(breadcrumb, showBack) {
  const nav = document.getElementById('app-nav');
  nav.hidden = false;
  document.getElementById('nav-breadcrumb').textContent = breadcrumb;
  document.getElementById('btn-back').hidden = !showBack;
}

function destroyChart() {
  if (_chart) {
    _chart.destroy();
    _chart = null;
  }
}

// ---------------------------------------------------------------------------
// Entry point called by app.js
// ---------------------------------------------------------------------------

/**
 * @param {YearlyOverview[]} overviews
 */
function renderApp(overviews) {
  _overviews = overviews;
  _activeYear = null;
  _activeMonth = null;

  // Wire back button (use onclick to avoid stacking listeners on re-load)
  document.getElementById('btn-back').onclick = handleBack;

  if (overviews.length === 1) {
    // Single year: skip multi-year view, go straight to year view
    renderYearView(overviews[0]);
  } else {
    renderMultiYearChart(overviews);
  }
}

function handleBack() {
  if (_activeMonth) {
    // Month → Year
    _activeMonth = null;
    renderYearView(_activeYear);
  } else if (_activeYear) {
    // Year → Multi-year
    _activeYear = null;
    renderMultiYearChart(_overviews);
  }
}

// ---------------------------------------------------------------------------
// Multi-year chart
// ---------------------------------------------------------------------------

/**
 * @param {YearlyOverview[]} overviews
 */
function renderMultiYearChart(overviews) {
  showView('view-multiyear');
  updateNav('Alle jaren', false);
  destroyChart();

  const labels = overviews.map(o => String(o.year));

  const ctx = document.getElementById('chart-multiyear').getContext('2d');
  _chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Inkomsten',
          data: overviews.map(o => o.totalIncome),
          backgroundColor: 'rgba(34,197,94,0.8)',
          borderColor:     'rgba(34,197,94,1)',
          borderWidth: 1,
        },
        {
          label: 'Uitgaven',
          data: overviews.map(o => o.totalExpenses),
          backgroundColor: 'rgba(239,68,68,0.8)',
          borderColor:     'rgba(239,68,68,1)',
          borderWidth: 1,
        },
        {
          label: 'Sparen',
          data: overviews.map(o => o.totalSavings),
          backgroundColor: 'rgba(59,130,246,0.8)',
          borderColor:     'rgba(59,130,246,1)',
          borderWidth: 1,
        },
      ],
    },
    options: chartOptions('Klik op een jaar voor details', (idx) => {
      renderYearView(overviews[idx]);
    }),
  });
}

// ---------------------------------------------------------------------------
// Year chart
// ---------------------------------------------------------------------------

/**
 * @param {YearlyOverview} yearly
 */
function renderYearView(yearly) {
  _activeYear = yearly;
  _activeMonth = null;
  showView('view-year');
  updateNav(String(yearly.year), _overviews.length > 1);
  destroyChart();

  const months  = yearly.months;
  const labels  = months.map(m => MONTH_NAMES[m.month - 1]);

  const ctx = document.getElementById('chart-year').getContext('2d');
  _chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Inkomsten',
          data: months.map(m => m.totalIncome),
          backgroundColor: 'rgba(34,197,94,0.8)',
          borderColor:     'rgba(34,197,94,1)',
          borderWidth: 1,
        },
        {
          label: 'Uitgaven',
          data: months.map(m => m.totalExpenses),
          backgroundColor: 'rgba(239,68,68,0.8)',
          borderColor:     'rgba(239,68,68,1)',
          borderWidth: 1,
        },
        {
          label: 'Sparen',
          data: months.map(m => m.totalSavings),
          backgroundColor: 'rgba(59,130,246,0.8)',
          borderColor:     'rgba(59,130,246,1)',
          borderWidth: 1,
        },
      ],
    },
    options: chartOptions('Klik op een maand voor details', (idx) => {
      renderMaandDetail(months[idx]);
    }),
  });
}

// ---------------------------------------------------------------------------
// Shared Chart.js options factory
// ---------------------------------------------------------------------------

function chartOptions(titleText, onClickCb) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    onClick(event, elements) {
      if (elements.length > 0) onClickCb(elements[0].index);
    },
    onHover(event, elements) {
      event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    },
    plugins: {
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: ctx => `  ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`,
        },
      },
      legend: {
        position: 'top',
      },
    },
    scales: {
      x: {
        grid: { display: false },
      },
      y: {
        ticks: {
          callback: v => '€ ' + v.toLocaleString('nl-NL'),
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Month detail view
// ---------------------------------------------------------------------------

/**
 * @param {MonthlyOverview} monthly
 */
function renderMaandDetail(monthly) {
  _activeMonth = monthly;
  showView('view-year+month');
  updateNav(monthly.label, true);

  // Wire threshold input (use onclick to avoid stacking on re-render)
  const thresholdInput = document.getElementById('threshold-input');
  thresholdInput.value = _specialThreshold;
  thresholdInput.onchange = () => {
    const val = parseFloat(thresholdInput.value);
    if (!isNaN(val) && val >= 0) {
      _specialThreshold = val;
      renderCards(monthly);
    }
  };

  renderCards(monthly);
}

function renderCards(monthly) {
  // Bijzondere: only show when there are matching transactions
  const bijzondereTxs = monthly.oneOffExpenses.filter(t => t.amount >= _specialThreshold);
  const cardBijEl = document.getElementById('card-bijzonder');
  cardBijEl.hidden = bijzondereTxs.length === 0;
  cardBijEl.innerHTML = bijzondereTxs.length > 0 ? cardBijzonder(monthly) : '';

  document.getElementById('net-balance-bar').innerHTML = netBalanceIndicator(monthly);
  document.getElementById('card-inkomsten').innerHTML  = cardInkomsten(monthly);
  document.getElementById('card-vaste').innerHTML      = cardVasteLasten(monthly);
  document.getElementById('card-eenmalig').innerHTML   = cardEenmaligeUitgaven(monthly);
  document.getElementById('card-sparen').innerHTML     = cardSparen(monthly);

  // Scroll cards into view smoothly
  document.getElementById('view-month').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Wire collapsible sections in Vaste lasten
  document.querySelectorAll('.category-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const body = btn.closest('.category-section').querySelector('.category-body');
      const isOpen = !body.hidden;
      body.hidden = isOpen;
      btn.querySelector('.toggle-arrow').textContent = isOpen ? '▶' : '▼';
    });
  });
}

// ---------------------------------------------------------------------------
// Net balance indicator
// ---------------------------------------------------------------------------

function netBalanceIndicator(ov) {
  const net = ov.netBalance;
  const cls = net >= 0 ? 'positive' : 'negative';
  const sign = net >= 0 ? '+' : '';
  return `
    <div class="net-balance ${cls}">
      <span class="net-label">Netto ${ov.label}</span>
      <span class="net-amount">${sign}${fmt(net)}</span>
      <span class="net-detail">
        ${fmt(ov.totalIncome)} inkomsten
        &minus; ${fmt(ov.totalExpenses)} uitgaven
        &minus; ${fmt(ov.totalSavings)} sparen
      </span>
    </div>`;
}

// ---------------------------------------------------------------------------
// Card: Inkomsten
// ---------------------------------------------------------------------------

function cardInkomsten(ov) {
  const rows = [];

  // Salary lines
  ov.salaryTransactions.forEach(tx => {
    rows.push(txRow(tx.name, tx.amount, 'credit'));
  });

  // Other income (Tikkies, overig, etc.)
  ov.otherIncome.forEach(tx => {
    rows.push(txRow(tx.name, tx.amount, 'credit'));
  });

  const isEmpty = rows.length === 0;

  return `
    <div class="card-header">
      <h3 class="card-title">Inkomsten</h3>
      <span class="card-total credit">${fmt(ov.totalIncome)}</span>
    </div>
    <div class="card-body">
      ${isEmpty
        ? '<p class="empty-state">Geen inkomsten deze maand</p>'
        : rows.join('')}
    </div>`;
}

// ---------------------------------------------------------------------------
// Card: Vaste lasten (recurring, grouped by category)
// ---------------------------------------------------------------------------

function cardVasteLasten(ov) {
  const recurringTotal = ov.recurringExpenses.reduce((s, c) => s + c.total, 0);

  if (ov.recurringExpenses.length === 0) {
    return `
      <div class="card-header">
        <h3 class="card-title">Vaste lasten</h3>
        <span class="card-total debit">${fmt(0)}</span>
      </div>
      <div class="card-body"><p class="empty-state">Geen vaste lasten herkend</p></div>`;
  }

  const sections = ov.recurringExpenses.map(breakdown => {
    const txRows = breakdown.transactions
      .sort((a, b) => b.amount - a.amount)
      .map(tx => txRow(tx.name, tx.amount, 'debit'))
      .join('');

    return `
      <div class="category-section">
        <button class="category-toggle">
          <span class="toggle-arrow">▶</span>
          <span class="category-name">${breakdown.category}</span>
          <span class="category-total debit">${fmt(breakdown.total)}</span>
        </button>
        <div class="category-body" hidden>
          ${txRows}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="card-header">
      <h3 class="card-title">Vaste lasten</h3>
      <span class="card-total debit">${fmt(recurringTotal)}</span>
    </div>
    <div class="card-body">
      ${sections}
    </div>`;
}

// ---------------------------------------------------------------------------
// Card: Eenmalige uitgaven (below threshold)
// ---------------------------------------------------------------------------

function cardEenmaligeUitgaven(ov) {
  const txs   = ov.oneOffExpenses.filter(t => t.amount < _specialThreshold);
  const total = txs.reduce((s, t) => s + t.amount, 0);

  return `
    <div class="card-header">
      <h3 class="card-title">Eenmalige uitgaven</h3>
      <span class="card-total debit">${fmt(total)}</span>
    </div>
    <div class="card-body card-body-scroll">
      ${txs.length === 0
        ? '<p class="empty-state">Geen eenmalige uitgaven</p>'
        : txs.map(tx => txRow(tx.name, tx.amount, 'debit')).join('')}
    </div>`;
}

// ---------------------------------------------------------------------------
// Card: Bijzondere uitgaven (at or above threshold, one-off only)
// ---------------------------------------------------------------------------

function cardBijzonder(ov) {
  const txs   = ov.oneOffExpenses.filter(t => t.amount >= _specialThreshold);
  const total = txs.reduce((s, t) => s + t.amount, 0);

  return `
    <div class="card-header">
      <h3 class="card-title">Bijzondere uitgaven <span class="threshold-badge">≥ ${fmt(_specialThreshold)}</span></h3>
      <span class="card-total debit">${fmt(total)}</span>
    </div>
    <div class="card-body">
      ${txs.length === 0
        ? '<p class="empty-state">Geen bijzondere uitgaven deze maand</p>'
        : txs.map(tx => txRow(tx.name, tx.amount, 'debit')).join('')}
    </div>`;
}

// ---------------------------------------------------------------------------
// Card: Sparen & Investeringen
// ---------------------------------------------------------------------------

function cardSparen(ov) {
  const savingsOut = ov.savingsTransfers.filter(t => t.direction === 'debit');
  const savingsIn  = ov.savingsTransfers.filter(t => t.direction === 'credit');

  const totalOut = savingsOut.reduce((s, t) => s + t.amount, 0);
  const totalIn  = savingsIn.reduce ((s, t) => s + t.amount, 0);

  if (ov.savingsTransfers.length === 0) {
    return `
      <div class="card-header">
        <h3 class="card-title">Sparen & Investeringen</h3>
        <span class="card-total savings">${fmt(0)}</span>
      </div>
      <div class="card-body"><p class="empty-state">Geen spaar­transacties</p></div>`;
  }

  const outRows = savingsOut.map(tx =>
    `<div class="tx-row">
      <span class="tx-name tx-icon-out" title="${tx.name}">→ ${trunc(tx.name)}</span>
      <span class="tx-amount savings-out">${fmt(tx.amount)}</span>
    </div>`
  ).join('');

  const inRows = savingsIn.map(tx =>
    `<div class="tx-row">
      <span class="tx-name tx-icon-in" title="${tx.name}">← ${trunc(tx.name)}</span>
      <span class="tx-amount savings-in">${fmt(tx.amount)}</span>
    </div>`
  ).join('');

  return `
    <div class="card-header">
      <h3 class="card-title">Sparen & Investeringen</h3>
      <span class="card-total savings-out">${fmt(totalOut)}</span>
    </div>
    <div class="card-body">
      ${outRows}
      ${inRows}
      ${(savingsIn.length > 0) ? `<div class="savings-summary">
        <span>Opname</span><span class="savings-in">${fmt(totalIn)}</span>
      </div>` : ''}
    </div>`;
}

// ---------------------------------------------------------------------------
// Shared tx row helper
// ---------------------------------------------------------------------------

/**
 * @param {string} name
 * @param {number} amount
 * @param {'credit'|'debit'} dir
 */
function txRow(name, amount, dir) {
  const cls = dir === 'credit' ? 'credit' : 'debit';
  return `<div class="tx-row">
    <span class="tx-name" title="${name}">${trunc(name)}</span>
    <span class="tx-amount ${cls}">${fmt(amount)}</span>
  </div>`;
}
