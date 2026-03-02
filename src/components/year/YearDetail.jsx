import ThresholdBar from '../month/ThresholdBar'
import SpecialExpensesCard from '../month/cards/SpecialExpensesCard'
import IncomeCard from '../month/cards/IncomeCard'
import RecurringExpensesCard from '../month/cards/RecurringExpensesCard'
import VariableExpensesCard from '../month/cards/VariableExpensesCard'
import OneOffExpensesCard from '../month/cards/OneOffExpensesCard'
import SavingsCard from '../month/cards/SavingsCard'

export default function YearDetail({ yearly, threshold, onThresholdChange, activeDatasets }) {
  return (
    <>
      <div className="card-grid" id="card-grid">
        <IncomeCard monthly={yearly} activeDatasets={activeDatasets} />
        <RecurringExpensesCard monthly={yearly} activeDatasets={activeDatasets} />
        <VariableExpensesCard monthly={yearly} activeDatasets={activeDatasets} />
        <OneOffExpensesCard monthly={yearly} threshold={threshold} activeDatasets={activeDatasets} />
        <SavingsCard monthly={yearly} activeDatasets={activeDatasets} />
      </div>
      <ThresholdBar threshold={threshold} onChange={onThresholdChange} />
      <SpecialExpensesCard monthly={yearly} threshold={threshold} />
    </>
  )
}
