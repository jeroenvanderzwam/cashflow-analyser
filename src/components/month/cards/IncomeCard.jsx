import { useState } from 'react'
import Card from './Card'
import TransactionRow from './TransactionRow'
import { fmt } from '../../../utils/fmt'

export default function IncomeCard({ monthly, activeDatasets }) {
  const { recurringIncome, oneOffIncome, totalIncome } = monthly
  const [openSections, setOpenSections] = useState(new Set())

  const showVast     = !activeDatasets || activeDatasets.has('Vast inkomen')
  const showVariabel = !activeDatasets || activeDatasets.has('Variabel inkomen')
  if (!showVast && !showVariabel) return null

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

      {showVast && recurringIncome.length > 0 && (
        <div className="category-section">
          <button className="category-toggle" onClick={() => toggle('vast')}>
            <span className="toggle-arrow">{openSections.has('vast') ? '▼' : '▶'}</span>
            <span className="category-name">Vast</span>
            <span className="category-total credit">{fmt(recurringTotal)}</span>
          </button>
          {openSections.has('vast') && (
            <div className="category-body">
              {recurringIncome.slice().sort((a, b) => b.amount - a.amount).map(tx => (
                <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="credit" />
              ))}
            </div>
          )}
        </div>
      )}

      {showVariabel && oneOffIncome.length > 0 && (
        <div className="category-section">
          <button className="category-toggle" onClick={() => toggle('variabel')}>
            <span className="toggle-arrow">{openSections.has('variabel') ? '▼' : '▶'}</span>
            <span className="category-name">Variabel</span>
            <span className="category-total credit" style={{ opacity: 0.75 }}>{fmt(oneOffTotal)}</span>
          </button>
          {openSections.has('variabel') && (
            <div className="category-body">
              {oneOffIncome.slice().sort((a, b) => b.amount - a.amount).map(tx => (
                <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="credit" />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
