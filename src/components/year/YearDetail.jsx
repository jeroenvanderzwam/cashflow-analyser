import ThresholdBar from '../month/ThresholdBar'
import SpecialExpensesCard from '../month/cards/SpecialExpensesCard'
import IncomeCard from '../month/cards/IncomeCard'
import RecurringExpensesCard from '../month/cards/RecurringExpensesCard'
import VariableExpensesCard from '../month/cards/VariableExpensesCard'
import OneOffExpensesCard from '../month/cards/OneOffExpensesCard'
import SavingsCard from '../month/cards/SavingsCard'

export default function YearDetail({ yearly, threshold, onThresholdChange }) {
  return (
    <>
      <ThresholdBar threshold={threshold} onChange={onThresholdChange} />
      <div className="card-grid" id="card-grid">
        <IncomeCard monthly={yearly} />
        <RecurringExpensesCard monthly={yearly} />
        <VariableExpensesCard monthly={yearly} />
        <OneOffExpensesCard monthly={yearly} threshold={threshold} />
        <SavingsCard monthly={yearly} />
        <SpecialExpensesCard monthly={yearly} threshold={threshold} />
      </div>
    </>
  )
}
