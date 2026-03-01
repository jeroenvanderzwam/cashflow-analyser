import { useState } from 'react'
import Card from './Card'
import TransactionRow from './TransactionRow'
import { fmt } from '../../../utils/fmt'

export default function RecurringExpensesCard({ monthly }) {
  const { recurringExpenses } = monthly
  const [openCategories, setOpenCategories] = useState(new Set())

  function toggle(category) {
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const recurringTotal = recurringExpenses.reduce((s, c) => s + c.total, 0)

  return (
    <Card title="Vaste lasten" total={fmt(recurringTotal)} totalClass="debit">
      {recurringExpenses.length === 0
        ? <p className="empty-state">Geen vaste lasten herkend</p>
        : recurringExpenses.map(breakdown => {
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
