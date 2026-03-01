import Card from './Card'
import TransactionRow from './TransactionRow'
import { fmt } from '../../../utils/fmt'

export default function SavingsCard({ monthly }) {
  const { savingsTransfers } = monthly
  const savingsOut = savingsTransfers.filter(t => t.direction === 'debit')
  const savingsIn  = savingsTransfers.filter(t => t.direction === 'credit')
  const totalOut   = savingsOut.reduce((s, t) => s + t.amount, 0)
  const totalIn    = savingsIn.reduce((s, t)  => s + t.amount, 0)

  return (
    <Card title="Sparen & Investeringen" total={fmt(totalOut)} totalClass="savings-out">
      {savingsTransfers.length === 0
        ? <p className="empty-state">Geen spaar­transacties</p>
        : (
          <>
            {savingsOut.map(tx => (
              <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="savings-out" prefix="→" />
            ))}
            {savingsIn.map(tx => (
              <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="savings-in" prefix="←" />
            ))}
            {savingsIn.length > 0 && (
              <div className="savings-summary">
                <span>Opname</span>
                <span className="savings-in">{fmt(totalIn)}</span>
              </div>
            )}
          </>
        )
      }
    </Card>
  )
}
