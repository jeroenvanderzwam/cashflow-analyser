import NetBalanceBar from './NetBalanceBar'
import ThresholdBar from './ThresholdBar'
import SpecialExpensesCard from './cards/SpecialExpensesCard'
import IncomeCard from './cards/IncomeCard'
import RecurringExpensesCard from './cards/RecurringExpensesCard'
import VariableExpensesCard from './cards/VariableExpensesCard'
import OneOffExpensesCard from './cards/OneOffExpensesCard'
import SavingsCard from './cards/SavingsCard'

export default function MonthDetail({ monthly, threshold, onThresholdChange, activeDatasets }) {
  return (
    <>
      <NetBalanceBar monthly={monthly} />
      <div className="card-grid" id="card-grid">
        <IncomeCard monthly={monthly} activeDatasets={activeDatasets} />
        <RecurringExpensesCard monthly={monthly} activeDatasets={activeDatasets} />
        <VariableExpensesCard monthly={monthly} activeDatasets={activeDatasets} />
        <OneOffExpensesCard monthly={monthly} threshold={threshold} activeDatasets={activeDatasets} />
        <SavingsCard monthly={monthly} activeDatasets={activeDatasets} />
      </div>
      <ThresholdBar threshold={threshold} onChange={onThresholdChange} />
      <SpecialExpensesCard monthly={monthly} threshold={threshold} />
    </>
  )
}
