import Card from './Card'
import TransactionRow from './TransactionRow'
import { fmt } from '../../../utils/fmt'
import { CATEGORY } from '../../../utils/analyser'

export default function SavingsCard({ monthly }) {
  const { savingsTransfers } = monthly

  const regularTransfers = savingsTransfers.filter(t => t.category === CATEGORY.SPAREN)
  const repayments       = savingsTransfers.filter(t => t.category === CATEGORY.AFLOSSING)

  const regularOut = regularTransfers.filter(t => t.direction === 'debit')
  const regularIn  = regularTransfers.filter(t => t.direction === 'credit')
  const totalOut   = regularOut.reduce((s, t) => s + t.amount, 0)
  const totalIn    = regularIn.reduce((s, t)  => s + t.amount, 0)
  const totalRep   = repayments.reduce((s, t)  => s + t.amount, 0)

  if (savingsTransfers.length === 0) {
    return (
      <Card title="Sparen & Aflossing" total={fmt(0)} totalClass="savings">
        <p className="empty-state">Geen spaar­transacties</p>
      </Card>
    )
  }

  return (
    <Card title="Sparen & Aflossing" total={fmt(totalOut + totalRep)} totalClass="savings-out">
      {regularOut.map(tx => (
        <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="savings-out" prefix="→" />
      ))}
      {regularIn.map(tx => (
        <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="savings-in" prefix="←" />
      ))}
      {regularIn.length > 0 && (
        <div className="savings-summary">
          <span>Opname</span>
          <span className="savings-in">{fmt(totalIn)}</span>
        </div>
      )}
      {repayments.length > 0 && (
        <>
          <div className="savings-summary" style={{ background: '#f5f3ff', borderColor: '#ddd6fe' }}>
            <span style={{ color: 'rgb(109,40,217)', fontWeight: 600 }}>Extra aflossing</span>
            <span style={{ color: 'rgb(109,40,217)', fontWeight: 700 }}>{fmt(totalRep)}</span>
          </div>
          {repayments.map(tx => (
            <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="savings-out" prefix="⬇" />
          ))}
        </>
      )}
    </Card>
  )
}
