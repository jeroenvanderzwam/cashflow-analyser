import { useState, useEffect } from 'react'
import { parseCSV } from './utils/parser'
import { analyse } from './utils/analyser'
import Header from './components/Header'
import Navigation from './components/Navigation'
import ErrorBanner from './components/ErrorBanner'
import MultiYearChart from './components/charts/MultiYearChart'
import YearChart from './components/charts/YearChart'
import MonthDetail from './components/month/MonthDetail'
import YearDetail from './components/year/YearDetail'

export default function App() {
  const [overviews, setOverviews]   = useState([])
  const [activeYear, setActiveYear] = useState(null)
  const [activeMonth, setActiveMonth] = useState(null)
  const [threshold, setThreshold]   = useState(200)
  const [error, setError]           = useState(null)

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

        {/* Year chart — stays visible (compact) when viewing month detail */}
        {activeYear && (
          <section id="view-year" className={`view${activeMonth ? ' chart-compact' : ''}`}>
            <YearChart yearly={activeYear} onMonthClick={setActiveMonth} compact={!!activeMonth} />
          </section>
        )}

        {/* Year detail — cards for the full year, shown when a year is selected but no month */}
        {activeYear && !activeMonth && (
          <section id="view-year-detail" className="view">
            <YearDetail
              yearly={activeYear}
              threshold={threshold}
              onThresholdChange={setThreshold}
            />
          </section>
        )}

        {/* Month detail */}
        {activeMonth && (
          <section id="view-month" className="view">
            <MonthDetail
              monthly={activeMonth}
              threshold={threshold}
              onThresholdChange={setThreshold}
            />
          </section>
        )}
      </main>
    </>
  )
}
