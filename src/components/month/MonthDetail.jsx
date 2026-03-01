import NetBalanceBar from './NetBalanceBar'
import ThresholdBar from './ThresholdBar'
import SpecialExpensesCard from './cards/SpecialExpensesCard'
import IncomeCard from './cards/IncomeCard'
import RecurringExpensesCard from './cards/RecurringExpensesCard'
import VariableExpensesCard from './cards/VariableExpensesCard'
import OneOffExpensesCard from './cards/OneOffExpensesCard'
import SavingsCard from './cards/SavingsCard'

export default function MonthDetail({ monthly, threshold, onThresholdChange }) {
  return (
    <>
      <NetBalanceBar monthly={monthly} />
      <div className="card-grid" id="card-grid">
        <IncomeCard monthly={monthly} />
        <RecurringExpensesCard monthly={monthly} />
        <VariableExpensesCard monthly={monthly} />
        <OneOffExpensesCard monthly={monthly} threshold={threshold} />
        <SavingsCard monthly={monthly} />
      </div>
      <ThresholdBar threshold={threshold} onChange={onThresholdChange} />
      <SpecialExpensesCard monthly={monthly} threshold={threshold} />
    </>
  )
}
