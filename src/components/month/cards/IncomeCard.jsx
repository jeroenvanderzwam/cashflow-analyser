import Card from './Card'
import TransactionRow from './TransactionRow'
import { fmt } from '../../../utils/fmt'

export default function IncomeCard({ monthly }) {
  const { salaryTransactions, otherIncome, totalIncome } = monthly
  const all = [...salaryTransactions, ...otherIncome]

  return (
    <Card title="Inkomsten" total={fmt(totalIncome)} totalClass="credit">
      {all.length === 0
        ? <p className="empty-state">Geen inkomsten deze maand</p>
        : all.map(tx => (
            <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="credit" />
          ))
      }
    </Card>
  )
}
