import { useState } from 'react'
import Card from './Card'
import TransactionRow from './TransactionRow'
import { fmt } from '../../../utils/fmt'
import { CATEGORY } from '../../../utils/analyser'

export default function SavingsCard({ monthly, activeDatasets }) {
  const { savingsTransfers } = monthly
  const [openSections, setOpenSections] = useState(new Set())

  const showSparen     = !activeDatasets || activeDatasets.has('Sparen')
  const showInvesteren = !activeDatasets || activeDatasets.has('Investeren')
  const showAflossing  = !activeDatasets || activeDatasets.has('Extra aflossing')
  if (!showSparen && !showInvesteren && !showAflossing) return null

  function toggle(key) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const regularTransfers = savingsTransfers.filter(t => t.category === CATEGORY.SPAREN)
  const investments      = savingsTransfers.filter(t => t.category === CATEGORY.INVESTEREN)
  const repayments       = savingsTransfers.filter(t => t.category === CATEGORY.AFLOSSING)

  const regularOut = regularTransfers.filter(t => t.direction === 'debit')
  const regularIn  = regularTransfers.filter(t => t.direction === 'credit')
  const investOut  = investments.filter(t => t.direction === 'debit')
  const investIn   = investments.filter(t => t.direction === 'credit')
  const repOut     = repayments.filter(t => t.direction === 'debit')
  const repIn      = repayments.filter(t => t.direction === 'credit')
  const totalOut   = regularOut.reduce((s, t) => s + t.amount, 0)
  const totalIn    = regularIn.reduce((s, t)  => s + t.amount, 0)
  const totalInv   = investOut.reduce((s, t) => s + t.amount, 0) - investIn.reduce((s, t) => s + t.amount, 0)
  const totalRep   = repOut.reduce((s, t) => s + t.amount, 0) - repIn.reduce((s, t) => s + t.amount, 0)

  if (savingsTransfers.length === 0) {
    return (
      <Card title="Sparen & Aflossing" total={fmt(0)} totalClass="savings">
        <p className="empty-state">Geen spaar­transacties</p>
      </Card>
    )
  }

  return (
    <Card title="Sparen & Aflossing" total={fmt(totalOut - totalIn + totalInv + totalRep)} totalClass="savings-out">

      {showSparen && regularTransfers.length > 0 && (
        <div className="category-section">
          <button className="category-toggle" onClick={() => toggle('sparen')}>
            <span className="toggle-arrow">{openSections.has('sparen') ? '▼' : '▶'}</span>
            <span className="category-name">Sparen</span>
            <span className="category-total savings-out">{fmt(totalOut - totalIn)}</span>
          </button>
          {openSections.has('sparen') && (
            <div className="category-body">
              {regularOut.map(tx => (
                <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="savings-out" prefix="→" />
              ))}
              {regularIn.map(tx => (
                <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="savings-in" prefix="←" />
              ))}
            </div>
          )}
        </div>
      )}

      {showInvesteren && investments.length > 0 && (
        <div className="category-section">
          <button className="category-toggle" onClick={() => toggle('investeren')}>
            <span className="toggle-arrow">{openSections.has('investeren') ? '▼' : '▶'}</span>
            <span className="category-name">Investeren</span>
            <span className="category-total savings-out">{fmt(totalInv)}</span>
          </button>
          {openSections.has('investeren') && (
            <div className="category-body">
              {investOut.map(tx => (
                <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="savings-out" prefix="→" />
              ))}
              {investIn.map(tx => (
                <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="savings-in" prefix="←" />
              ))}
            </div>
          )}
        </div>
      )}

      {showAflossing && repayments.length > 0 && (
        <div className="category-section">
          <button className="category-toggle" onClick={() => toggle('aflossing')}
            style={{ background: '#f5f3ff', borderColor: '#ddd6fe' }}>
            <span className="toggle-arrow" style={{ color: 'rgb(109,40,217)' }}>{openSections.has('aflossing') ? '▼' : '▶'}</span>
            <span className="category-name" style={{ color: 'rgb(109,40,217)', fontWeight: 600 }}>Extra aflossing</span>
            <span className="category-total" style={{ color: 'rgb(109,40,217)', fontWeight: 700 }}>{fmt(totalRep)}</span>
          </button>
          {openSections.has('aflossing') && (
            <div className="category-body">
              {repOut.map(tx => (
                <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="savings-out" prefix="⬇" />
              ))}
              {repIn.map(tx => (
                <TransactionRow key={tx.id} name={tx.name} amount={tx.amount} direction="savings-in" prefix="←" />
              ))}
            </div>
          )}
        </div>
      )}

    </Card>
  )
}
