import { fmt, trunc } from '../../../utils/fmt'

export default function TransactionRow({ name, amount, direction, prefix }) {
  return (
    <div className="tx-row">
      <span className="tx-name" title={name}>
        {prefix ? `${prefix} ` : ''}{trunc(name)}
      </span>
      <span className={`tx-amount ${direction}`}>{fmt(amount)}</span>
    </div>
  )
}
