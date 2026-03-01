import NetBalanceBar from './NetBalanceBar'
import ThresholdBar from './ThresholdBar'
import SpecialExpensesCard from './cards/SpecialExpensesCard'
import IncomeCard from './cards/IncomeCard'
import RecurringExpensesCard from './cards/RecurringExpensesCard'
import OneOffExpensesCard from './cards/OneOffExpensesCard'
import SavingsCard from './cards/SavingsCard'

export default function MonthDetail({ monthly, threshold, onThresholdChange }) {
  return (
    <>
      <NetBalanceBar monthly={monthly} />
      <ThresholdBar threshold={threshold} onChange={onThresholdChange} />
      <div className="card-grid" id="card-grid">
        <SpecialExpensesCard monthly={monthly} threshold={threshold} />
        <IncomeCard monthly={monthly} />
        <RecurringExpensesCard monthly={monthly} />
        <OneOffExpensesCard monthly={monthly} threshold={threshold} />
        <SavingsCard monthly={monthly} />
      </div>
    </>
  )
}
