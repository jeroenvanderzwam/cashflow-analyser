export default function ThresholdBar({ threshold, onChange }) {
  function handleChange(e) {
    const val = parseFloat(e.target.value)
    if (!isNaN(val) && val >= 0) onChange(val)
  }

  return (
    <div className="threshold-bar">
      <label htmlFor="threshold-input">Drempel bijzondere uitgaven:</label>
      <span className="threshold-prefix">€</span>
      <input
        type="number"
        id="threshold-input"
        value={threshold}
        min="0"
        step="10"
        onChange={handleChange}
      />
    </div>
  )
}
