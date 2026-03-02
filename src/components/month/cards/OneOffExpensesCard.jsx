import Card from './Card'
import TransactionRow from './TransactionRow'
import { fmt } from '../../../utils/fmt'

const BIJZONDER_DREMPEL = 200

export default function OneOffExpensesCard({ monthly, activeDatasets }) {
  if (activeDatasets && !activeDatasets.has('Eenmalige uitgaven')) return null

  const normal  = monthly.oneOffExpenses.filter(t => t.amount <  BIJZONDER_DREMPEL)
  const special = monthly.oneOffExpenses.filter(t => t.amount >= BIJZONDER_DREMPEL)
  const total   = monthly.oneOffExpenses.reduce((s, t) => s + t.amount, 0)

  return (
    <Card title="Eenmalige uitgaven" total={fmt(total)} totalClass="debit" scrollable>
      {normal.length === 0 && special.length === 0 && (
        <p className="empty-state">Geen eenmalige uitgaven</p>
      )}
      {normal.map(tx => (
        <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="debit" />
      ))}
      {special.length > 0 && (
        <>
          <div className="section-divider">Bijzonder <span className="threshold-badge">&ge; {fmt(BIJZONDER_DREMPEL)}</span></div>
          {special.map(tx => (
            <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="debit" />
          ))}
        </>
      )}
    </Card>
  )
}
