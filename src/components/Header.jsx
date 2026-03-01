export default function Header({ onFilesSelected }) {
  function handleChange(e) {
    const files = Array.from(e.target.files)
    if (files.length > 0) onFilesSelected(files)
  }

  return (
    <header id="app-header">
      <div className="header-left">
        <h1>Cashflow Analyser</h1>
      </div>
      <div className="header-right">
        <label className="file-btn" title="Selecteer één of meerdere CSV-bestanden">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          CSV laden
          <input type="file" accept=".csv" multiple hidden onChange={handleChange} />
        </label>
      </div>
    </header>
  )
}
