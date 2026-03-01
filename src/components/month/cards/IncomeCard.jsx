import { useState } from 'react'
import Card from './Card'
import TransactionRow from './TransactionRow'
import { fmt } from '../../../utils/fmt'

export default function IncomeCard({ monthly }) {
  const { recurringIncome, oneOffIncome, totalIncome } = monthly
  const [openSections, setOpenSections] = useState(new Set())

  function toggle(key) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const recurringTotal = recurringIncome.reduce((s, t) => s + t.amount, 0)
  const oneOffTotal    = oneOffIncome.reduce((s, t) => s + t.amount, 0)

  return (
    <Card title="Inkomsten" total={fmt(totalIncome)} totalClass="credit">
      {recurringIncome.length === 0 && oneOffIncome.length === 0 && (
        <p className="empty-state">Geen inkomsten deze maand</p>
      )}

      {recurringIncome.length > 0 && (
        <div className="category-section">
          <button className="category-toggle" onClick={() => toggle('vast')}>
            <span className="toggle-arrow">{openSections.has('vast') ? '▼' : '▶'}</span>
            <span className="category-name">Vast</span>
            <span className="category-total credit">{fmt(recurringTotal)}</span>
          </button>
          {openSections.has('vast') && (
            <div className="category-body">
              {recurringIncome.map(tx => (
                <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="credit" />
              ))}
            </div>
          )}
        </div>
      )}

      {oneOffIncome.length > 0 && (
        <div className="category-section">
          <button className="category-toggle" onClick={() => toggle('eenmalig')}>
            <span className="toggle-arrow">{openSections.has('eenmalig') ? '▼' : '▶'}</span>
            <span className="category-name">Eenmalig</span>
            <span className="category-total credit" style={{ opacity: 0.75 }}>{fmt(oneOffTotal)}</span>
          </button>
          {openSections.has('eenmalig') && (
            <div className="category-body">
              {oneOffIncome.map(tx => (
                <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="credit" />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
