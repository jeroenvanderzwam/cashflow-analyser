export default function Card({ title, total, totalClass, scrollable, wide, badge, children }) {
  return (
    <div className={`card${wide ? ' card-wide' : ''}`}>
      <div className="card-header">
        <h3 className="card-title">
          {title}
          {badge && <span className="threshold-badge">{badge}</span>}
        </h3>
        <span className={`card-total ${totalClass}`}>{total}</span>
      </div>
      <div className={`card-body${scrollable ? ' card-body-scroll' : ''}`}>
        {children}
      </div>
    </div>
  )
}
