import { Bar } from 'react-chartjs-2'
import { fmt } from '../../utils/fmt'
import { MONTH_NAMES } from '../../utils/analyser'

const GROUPS = [
  { key: 'income',   label: 'Inkomen',      color: 'rgba(22,163,74,1)',
    datasets: [
      { label: 'Vast inkomen', short: 'Vast' },
      { label: 'Eenmalig inkomen',    short: 'Eenmalig' },
    ],
  },
  { key: 'expenses', label: 'Uitgaven',     color: 'rgba(185,28,28,1)',
    datasets: [
      { label: 'Vaste lasten',        short: 'Vast' },
      { label: 'Variabele uitgaven',  short: 'Variabel' },
      { label: 'Eenmalige uitgaven',  short: 'Eenmalig' },
    ],
  },
  { key: 'savings',  label: 'Overig', color: 'rgba(59,130,246,1)',
    datasets: [
      { label: 'Sparen',          short: 'Sparen' },
      { label: 'Investeren',      short: 'Investeren' },
      { label: 'Extra aflossing', short: 'Aflossing' },
    ],
  },
]

export const ALL_LABELS = new Set(GROUPS.flatMap(g => g.datasets.map(d => d.label)))

const ALL_DATASETS = [
  { label: 'Vast inkomen',  backgroundColor: 'rgba(22,163,74,0.85)',   borderColor: 'rgba(22,163,74,1)',   borderWidth: 1, stack: 'income' },
  { label: 'Eenmalig inkomen',     backgroundColor: 'rgba(134,239,172,0.85)', borderColor: 'rgba(134,239,172,1)', borderWidth: 1, stack: 'income' },
  { label: 'Vaste lasten',         backgroundColor: 'rgba(185,28,28,0.85)',   borderColor: 'rgba(185,28,28,1)',   borderWidth: 1, stack: 'expenses' },
  { label: 'Variabele uitgaven',   backgroundColor: 'rgba(239,68,68,0.8)',    borderColor: 'rgba(239,68,68,1)',   borderWidth: 1, stack: 'expenses' },
  { label: 'Eenmalige uitgaven',   backgroundColor: 'rgba(252,165,165,0.85)', borderColor: 'rgba(252,165,165,1)', borderWidth: 1, stack: 'expenses' },
  { label: 'Sparen',               backgroundColor: 'rgba(59,130,246,0.8)',   borderColor: 'rgba(59,130,246,1)',  borderWidth: 1 },
  { label: 'Investeren',           backgroundColor: 'rgba(20,184,166,0.8)',   borderColor: 'rgba(20,184,166,1)',  borderWidth: 1 },
  { label: 'Extra aflossing',      backgroundColor: 'rgba(139,92,246,0.8)',   borderColor: 'rgba(139,92,246,1)',  borderWidth: 1 },
]

export default function YearChart({ yearly, onMonthClick, compact, active, onToggleDataset, onToggleGroup }) {
  const months = yearly.months
  const labels = months.map(m => MONTH_NAMES[m.month - 1])

  const dataMap = Object.fromEntries(
    months.map(m => [m.month, {
      'Vast inkomen': m.totalStructuralIncome,
      'Eenmalig inkomen':    m.totalOneOffIncome,
      'Vaste lasten':        m.totalVast,
      'Variabele uitgaven':  m.totalVariabel,
      'Eenmalige uitgaven':  m.totalOneOff,
      'Sparen':              m.totalSavings,
      'Investeren':          m.totalInvestments,
      'Extra aflossing':     m.totalRepayments,
    }])
  )

  const datasets = ALL_DATASETS
    .filter(d => active.has(d.label))
    .map(d => ({ ...d, data: months.map(m => dataMap[m.month][d.label]) }))

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick(event, elements) {
      if (elements.length > 0) onMonthClick(months[elements[0].index])
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
                onClick={() => onToggleGroup(g.datasets.map(d => d.label))}
              >
                {g.label}
              </button>
              <div className="chart-dataset-pills">
                {g.datasets.map(d => (
                  <button
                    key={d.label}
                    className={`chart-dataset-pill${active.has(d.label) ? ' active' : ''}`}
                    style={{ '--group-color': g.color }}
                    onClick={() => onToggleDataset(d.label)}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ height: compact ? '260px' : '380px' }}>
        <Bar data={{ labels, datasets }} options={options} />
      </div>
    </div>
  )
}
