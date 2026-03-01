import Card from './Card'
import TransactionRow from './TransactionRow'
import { fmt } from '../../../utils/fmt'

export default function OneOffExpensesCard({ monthly, threshold }) {
  const txs   = monthly.oneOffExpenses.filter(t => t.amount < threshold)
  const total = txs.reduce((s, t) => s + t.amount, 0)

  return (
    <Card title="Eenmalige uitgaven" total={fmt(total)} totalClass="debit" scrollable>
      {txs.length === 0
        ? <p className="empty-state">Geen eenmalige uitgaven</p>
        : txs.map(tx => (
            <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="debit" />
          ))
      }
    </Card>
  )
}
