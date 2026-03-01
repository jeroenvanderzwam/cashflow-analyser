import { fmt } from '../utils/fmt'

export default function YearSummary({ yearly }) {
  const n = yearly.months.length
  if (n === 0) return null

  const avg    = x => fmt(x / n)
  const netAvg = yearly.netBalance / n
  const netCls = netAvg >= 0 ? 'credit' : 'debit'

  return (
    <div className="year-summary">
      <span className="summary-label">Gem. per maand ({n} mnd):</span>
      <span className="summary-item credit">{avg(yearly.totalIncome)} inkomen</span>
      <span className="summary-item debit">{avg(yearly.totalExpenses)} uitgaven</span>
      <span className="summary-item savings">{avg(yearly.totalSavings)} sparen</span>
      <span className={`summary-item ${netCls}`}>{avg(yearly.netBalance)} netto</span>
    </div>
  )
}
