import IncomeCard from '../month/cards/IncomeCard'
import RecurringExpensesCard from '../month/cards/RecurringExpensesCard'
import VariableExpensesCard from '../month/cards/VariableExpensesCard'
import OneOffExpensesCard from '../month/cards/OneOffExpensesCard'
import SavingsCard from '../month/cards/SavingsCard'

export default function YearDetail({ yearly, activeDatasets }) {
  return (
    <div className="card-grid" id="card-grid">
      <IncomeCard monthly={yearly} activeDatasets={activeDatasets} />
      <RecurringExpensesCard monthly={yearly} activeDatasets={activeDatasets} />
      <VariableExpensesCard monthly={yearly} activeDatasets={activeDatasets} />
      <OneOffExpensesCard monthly={yearly} activeDatasets={activeDatasets} />
      <SavingsCard monthly={yearly} activeDatasets={activeDatasets} />
    </div>
  )
}
