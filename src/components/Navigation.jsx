export default function Navigation({ breadcrumb, showBack, onBack }) {
  return (
    <nav id="app-nav">
      {showBack && (
        <button className="btn-back" onClick={onBack}>← Terug</button>
      )}
      <span id="nav-breadcrumb">{breadcrumb}</span>
    </nav>
  )
}
