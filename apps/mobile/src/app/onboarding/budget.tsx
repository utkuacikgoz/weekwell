import { BudgetControl } from '../../components/BudgetControl';
import { StepScreen } from '../../components/StepScreen';
import { useStore } from '../../state/store';

export default function BudgetStep() {
  const { data, setDraft } = useStore();
  return (
    <StepScreen step="budget" title="Weekly grocery budget" intro="For all ten meals. We’ll show whether the week fits.">
      <BudgetControl value={data.draft.weeklyBudget} householdSize={data.draft.householdSize} onChange={(weeklyBudget) => setDraft({ weeklyBudget })} />
    </StepScreen>
  );
}
