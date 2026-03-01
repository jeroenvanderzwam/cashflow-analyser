import { fmt } from '../../utils/fmt'

export default function NetBalanceBar({ monthly }) {
  const net  = monthly.netBalance
  const cls  = net >= 0 ? 'positive' : 'negative'
  const sign = net >= 0 ? '+' : ''

  return (
    <div className={`net-balance ${cls}`}>
      <span className="net-label">Netto {monthly.label}</span>
      <span className="net-amount">{sign}{fmt(net)}</span>
      <span className="net-detail">
        {fmt(monthly.totalIncome)} inkomsten
        {' \u2212 '}{fmt(monthly.totalExpenses)} uitgaven
      </span>
    </div>
  )
}
