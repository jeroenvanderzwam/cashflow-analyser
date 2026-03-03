import { useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { fmt } from '../../utils/fmt'

const GROUPS = [
  { key: 'income',   label: 'Inkomen',      color: 'rgba(22,163,74,1)',
    datasets: [
      { label: 'Vast inkomen', short: 'Vast' },
      { label: 'Variabel inkomen',    short: 'Variabel' },
    ],
  },
  { key: 'expenses', label: 'Uitgaven',     color: 'rgba(185,28,28,1)',
    datasets: [
      { label: 'Vaste lasten',        short: 'Vast' },
      { label: 'Variabele uitgaven',  short: 'Variabel' },
    ],
  },
  { key: 'savings',  label: 'Overig', color: 'rgba(59,130,246,1)',
    datasets: [
      { label: 'Sparen',          short: 'Sparen' },
      { label: 'Beleggen',      short: 'Beleggen' },
      { label: 'Extra aflossing', short: 'Aflossing' },
    ],
  },
]

const ALL_LABELS = new Set(GROUPS.flatMap(g => g.datasets.map(d => d.label)))

const ALL_DATASETS = [
  { label: 'Vast inkomen',  backgroundColor: 'rgba(22,163,74,0.85)',   borderColor: 'rgba(22,163,74,1)',   borderWidth: 1, stack: 'income' },
  { label: 'Variabel inkomen',     backgroundColor: 'rgba(134,239,172,0.85)', borderColor: 'rgba(134,239,172,1)', borderWidth: 1, stack: 'income' },
  { label: 'Vaste lasten',         backgroundColor: 'rgba(185,28,28,0.85)',   borderColor: 'rgba(185,28,28,1)',   borderWidth: 1, stack: 'expenses' },
  { label: 'Variabele uitgaven',   backgroundColor: 'rgba(239,68,68,0.8)',    borderColor: 'rgba(239,68,68,1)',   borderWidth: 1, stack: 'expenses' },
  { label: 'Sparen',               backgroundColor: 'rgba(59,130,246,0.8)',   borderColor: 'rgba(59,130,246,1)',  borderWidth: 1 },
  { label: 'Beleggen',           backgroundColor: 'rgba(20,184,166,0.8)',   borderColor: 'rgba(20,184,166,1)',  borderWidth: 1 },
  { label: 'Extra aflossing',      backgroundColor: 'rgba(139,92,246,0.8)',   borderColor: 'rgba(139,92,246,1)',  borderWidth: 1 },
]

export default function MultiYearChart({ overviews, onYearClick }) {
  const labels = overviews.map(o => String(o.year))
  const [active, setActive] = useState(new Set(ALL_LABELS))

  function toggleDataset(label) {
    setActive(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  function toggleGroup(g) {
    const groupLabels = g.datasets.map(d => d.label)
    const allOn = groupLabels.every(l => active.has(l))
    setActive(prev => {
      const next = new Set(prev)
      if (allOn) groupLabels.forEach(l => next.delete(l))
      else groupLabels.forEach(l => next.add(l))
      return next
    })
  }

  const dataMap = Object.fromEntries(
    overviews.map(o => [o.year, {
      'Vast inkomen': o.totalStructuralIncome,
      'Variabel inkomen':    o.totalOneOffIncome,
      'Vaste lasten':        o.totalVast,
      'Variabele uitgaven':  o.totalVariabel,
      'Sparen':              o.totalSavings,
      'Beleggen':          o.totalInvestments,
      'Extra aflossing':     o.totalRepayments,
    }])
  )

  const datasets = ALL_DATASETS
    .filter(d => active.has(d.label))
    .map(d => ({ ...d, data: overviews.map(o => dataMap[o.year][d.label]) }))

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick(event, elements) {
      if (elements.length > 0) onYearClick(overviews[elements[0].index])
    },
    onHover(event, elements) {
      event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default'
    },
    plugins: {
      tooltip: { callbacks: { label: ctx => `  ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` } },
      legend: { display: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: { ticks: { callback: v => '€ ' + v.toLocaleString('nl-NL') } },
    },
  }

  return (
    <div className="chart-container">
      <div className="chart-group-toggles">
        {GROUPS.map(g => {
          const groupLabels = g.datasets.map(d => d.label)
          const activeCount = groupLabels.filter(l => active.has(l)).length
          const state = activeCount === 0 ? 'off' : activeCount === groupLabels.length ? 'all' : 'partial'
          return (
            <div key={g.key} className="chart-toggle-group">
              <button
                className={`chart-group-btn ${state}`}
                style={{ '--group-color': g.color }}
                onClick={() => toggleGroup(g)}
              >
                {g.label}
              </button>
              <div className="chart-dataset-pills">
                {g.datasets.map(d => (
                  <button
                    key={d.label}
                    className={`chart-dataset-pill${active.has(d.label) ? ' active' : ''}`}
                    style={{ '--group-color': g.color }}
                    onClick={() => toggleDataset(d.label)}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ height: '380px' }}>
        <Bar data={{ labels, datasets }} options={options} />
      </div>
    </div>
  )
}
