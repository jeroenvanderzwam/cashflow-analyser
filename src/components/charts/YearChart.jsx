import { Bar } from 'react-chartjs-2'
import { fmt } from '../../utils/fmt'
import { MONTH_NAMES } from '../../utils/analyser'

function netLineDataset(data) {
  return {
    type: 'line',
    label: 'Netto',
    data,
    borderColor:     'rgba(234,179,8,1)',
    backgroundColor: 'rgba(234,179,8,0.08)',
    borderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    tension: 0.3,
    yAxisID: 'y',
  }
}

export default function YearChart({ yearly, onMonthClick, compact }) {
  const months = yearly.months
  const labels = months.map(m => MONTH_NAMES[m.month - 1])

  const data = {
    labels,
    datasets: [
      {
        label: 'Structureel inkomen',
        data: months.map(m => m.totalStructuralIncome),
        backgroundColor: 'rgba(22,163,74,0.85)',
        borderColor:     'rgba(22,163,74,1)',
        borderWidth: 1,
        stack: 'income',
      },
      {
        label: 'Eenmalig inkomen',
        data: months.map(m => m.totalOneOffIncome),
        backgroundColor: 'rgba(134,239,172,0.85)',
        borderColor:     'rgba(134,239,172,1)',
        borderWidth: 1,
        stack: 'income',
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
      {
        label: 'Extra aflossing',
        data: months.map(m => m.totalRepayments),
        backgroundColor: 'rgba(139,92,246,0.8)',
        borderColor:     'rgba(139,92,246,1)',
        borderWidth: 1,
      },
      netLineDataset(months.map(m => m.netBalance)),
    ],
  }

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
      tooltip: {
        callbacks: {
          label: ctx => `  ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`,
        },
      },
      legend: { position: 'top' },
    },
    scales: {
      x: { grid: { display: false } },
      y: { ticks: { callback: v => '€ ' + v.toLocaleString('nl-NL') } },
    },
  }

  return (
    <div className="chart-container">
      <div style={{ height: compact ? '260px' : '380px' }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  )
}
