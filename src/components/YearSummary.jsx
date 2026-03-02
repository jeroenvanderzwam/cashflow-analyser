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
      <span className="summary-item credit">{avg(yearly.totalStructuralIncome)} structureel inkomen</span>
      {yearly.totalOneOffIncome > 0 && (
        <span className="summary-item credit" style={{ opacity: 0.65 }}>{avg(yearly.totalOneOffIncome)} variabel inkomen</span>
      )}
      <span className="summary-item debit">{avg(yearly.totalVast)} vast</span>
      <span className="summary-item debit" style={{ opacity: 0.8 }}>{avg(yearly.totalVariabel)} variabel</span>
      {yearly.totalRepayments > 0 && (
        <span className="summary-item" style={{ color: 'rgb(139,92,246)' }}>{avg(yearly.totalRepayments)} aflossing</span>
      )}
      <span className={`summary-item ${netCls}`}>{avg(yearly.netBalance)} netto</span>
    </div>
  )
}
