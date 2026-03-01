import Card from './Card'
import TransactionRow from './TransactionRow'
import { fmt } from '../../../utils/fmt'

export default function SpecialExpensesCard({ monthly, threshold }) {
  const txs = monthly.oneOffExpenses.filter(t => t.amount >= threshold)

  // Hidden when nothing qualifies
  if (txs.length === 0) return null

  const total = txs.reduce((s, t) => s + t.amount, 0)
  const badge = `\u2265 ${fmt(threshold)}`

  return (
    <Card title="Bijzondere uitgaven" total={fmt(total)} totalClass="debit" wide badge={badge}>
      {txs.map(tx => (
        <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="debit" />
      ))}
    </Card>
  )
}
