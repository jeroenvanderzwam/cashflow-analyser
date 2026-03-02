import { useState } from 'react'
import Card from './Card'
import TransactionRow from './TransactionRow'
import { fmt } from '../../../utils/fmt'

export default function RecurringExpensesCard({ monthly, activeDatasets }) {
  const { vastExpenses, totalVast } = monthly
  const [openCategories, setOpenCategories] = useState(new Set())

  if (activeDatasets && !activeDatasets.has('Vaste lasten')) return null

  function toggle(category) {
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  return (
    <Card title="Vaste lasten" total={fmt(totalVast)} totalClass="debit">
      {vastExpenses.length === 0
        ? <p className="empty-state">Geen vaste lasten herkend</p>
        : vastExpenses.map(breakdown => {
            const isOpen = openCategories.has(breakdown.category)
            return (
              <div key={breakdown.category} className="category-section">
                <button className="category-toggle" onClick={() => toggle(breakdown.category)}>
                  <span className="toggle-arrow">{isOpen ? '▼' : '▶'}</span>
                  <span className="category-name">{breakdown.category}</span>
                  <span className="category-total debit">{fmt(breakdown.total)}</span>
                </button>
                {isOpen && (
                  <div className="category-body">
                    {breakdown.transactions
                      .slice()
                      .sort((a, b) => b.amount - a.amount)
                      .map(tx => (
                        <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="debit" />
                      ))
                    }
                  </div>
                )}
              </div>
            )
          })
      }
    </Card>
  )
}
