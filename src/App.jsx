import { useState, useEffect } from 'react'
import { parseCSV } from './utils/parser'
import { analyse } from './utils/analyser'
import Header from './components/Header'
import Navigation from './components/Navigation'
import ErrorBanner from './components/ErrorBanner'
import MultiYearChart from './components/charts/MultiYearChart'
import YearChart, { ALL_LABELS } from './components/charts/YearChart'
import MonthDetail from './components/month/MonthDetail'
import YearDetail from './components/year/YearDetail'

function mergeGroups(groups) {
  const map = new Map()
  for (const g of groups) {
    if (!map.has(g.category)) map.set(g.category, { category: g.category, transactions: [], total: 0 })
    const entry = map.get(g.category)
    entry.transactions.push(...g.transactions)
    entry.total += g.total
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

function buildAllYearsOverview(overviews) {
  const sum = key => overviews.reduce((s, o) => s + o[key], 0)
  return {
    totalIncome:           sum('totalIncome'),
    totalStructuralIncome: sum('totalStructuralIncome'),
    totalOneOffIncome:     sum('totalOneOffIncome'),
    totalExpenses:         sum('totalExpenses'),
    totalVast:             sum('totalVast'),
    totalVariabel:         sum('totalVariabel'),
    totalSavings:          sum('totalSavings'),
    totalInvestments:      sum('totalInvestments'),
    totalRepayments:       sum('totalRepayments'),
    netBalance:            sum('netBalance'),
    vastExpenses:     mergeGroups(overviews.flatMap(o => o.vastExpenses)),
    variabelExpenses: mergeGroups(overviews.flatMap(o => o.variabelExpenses)),
    recurringIncome:  overviews.flatMap(o => o.recurringIncome),
    oneOffIncome:     overviews.flatMap(o => o.oneOffIncome),
    savingsTransfers: overviews.flatMap(o => o.savingsTransfers),
  }
}

export default function App() {
  const [overviews, setOverviews]         = useState([])
  const [activeYear, setActiveYear]       = useState(null)
  const [activeMonth, setActiveMonth]     = useState(null)
  const [error, setError]                 = useState(null)
  const [activeDatasets, setActiveDatasets] = useState(new Set(ALL_LABELS))

  // Auto-load all years + custom categories from FastAPI on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/years')
        .then(r => r.json())
        .then(years => Promise.all(years.map(y => fetch(`/api/data/${y}`).then(r => r.text())))),
    ])
      .then(([categories, csvTexts]) => loadFromTexts(csvTexts, categories))
      .catch(err => setError('Kon data niet laden: ' + err.message))
  }, [])

  // Reset chart toggles whenever a different year is selected
  useEffect(() => {
    setActiveDatasets(new Set(ALL_LABELS))
  }, [activeYear])

  // Scroll month detail into view whenever activeMonth changes
  useEffect(() => {
    if (activeMonth) {
      setTimeout(() => {
        document.getElementById('view-month')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
  }, [activeMonth])

  function loadFromTexts(csvTexts, categories = {}) {
    try {
      const txs = csvTexts.flatMap(text => parseCSV(text))
      if (txs.length === 0) throw new Error('Geen transacties gevonden.')
      const result = analyse(txs, categories)
      setOverviews(result)
      setError(null)
      setActiveYear(result.length === 1 ? result[0] : null)
      setActiveMonth(null)
    } catch (err) {
      setError(err.message)
    }
  }

  function toggleDataset(label) {
    setActiveDatasets(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  function toggleGroup(groupLabels) {
    setActiveDatasets(prev => {
      const allOn = groupLabels.every(l => prev.has(l))
      const next = new Set(prev)
      if (allOn) groupLabels.forEach(l => next.delete(l))
      else groupLabels.forEach(l => next.add(l))
      return next
    })
  }

  function handleBack() {
    if (activeMonth) {
      setActiveMonth(null)
    } else if (activeYear) {
      setActiveYear(null)
    }
  }

  // Nav state
  let breadcrumb = ''
  let showBack = false
  if (activeMonth) {
    breadcrumb = activeMonth.label
    showBack = true
  } else if (activeYear) {
    breadcrumb = String(activeYear.year)
    showBack = overviews.length > 1
  } else if (overviews.length > 0) {
    breadcrumb = 'Alle jaren'
  }

  return (
    <>
      <Header />
      {error && <ErrorBanner error={error} />}
      {overviews.length > 0 && (
        <Navigation breadcrumb={breadcrumb} showBack={showBack} onBack={handleBack} />
      )}

      <main id="app-main">
        {/* Multi-year chart — shown when no year is selected and multiple years exist */}
        {!activeYear && overviews.length > 1 && (
          <section id="view-multiyear" className="view">
            <MultiYearChart overviews={overviews} onYearClick={setActiveYear} />
            <p className="chart-hint">Klik op een jaar voor het maandoverzicht</p>
          </section>
        )}

        {/* All-years detail — totaalkaarten onder de multi-year chart */}
        {!activeYear && overviews.length > 1 && (
          <section id="view-allyears-detail" className="view">
            <YearDetail yearly={buildAllYearsOverview(overviews)} activeDatasets={activeDatasets} />
          </section>
        )}

        {/* Year chart — stays visible (compact) when viewing month detail */}
        {activeYear && (
          <section id="view-year" className={`view${activeMonth ? ' chart-compact' : ''}`}>
            <YearChart
              yearly={activeYear}
              onMonthClick={setActiveMonth}
              compact={!!activeMonth}
              active={activeDatasets}
              onToggleDataset={toggleDataset}
              onToggleGroup={toggleGroup}
            />
          </section>
        )}

        {/* Year detail — cards for the full year, shown when a year is selected but no month */}
        {activeYear && !activeMonth && (
          <section id="view-year-detail" className="view">
            <YearDetail
              yearly={activeYear}
              activeDatasets={activeDatasets}
            />
          </section>
        )}

        {/* Month detail */}
        {activeMonth && (
          <section id="view-month" className="view">
            <MonthDetail
              monthly={activeMonth}
              activeDatasets={activeDatasets}
            />
          </section>
        )}
      </main>
    </>
  )
}
