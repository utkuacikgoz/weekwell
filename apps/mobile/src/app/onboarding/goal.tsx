import { PROTEIN_GOALS } from '@weekwell/domain';
import { ChoiceRow } from '../../components/ChoiceRow';
import { StepScreen } from '../../components/StepScreen';
import { GOAL_COPY } from '../../copy';
import { useStore } from '../../state/store';

export default function GoalStep() {
  const { data, setDraft } = useStore();
  return (
    <StepScreen step="goal" title="What matters most this week?" intro="Pick one. It decides which meals come first.">
      {PROTEIN_GOALS.map((g) => (
        <ChoiceRow key={g} testID={`goal-${g}`} label={GOAL_COPY[g].label} detail={GOAL_COPY[g].detail} selected={data.draft.proteinGoal === g} onPress={() => setDraft({ proteinGoal: g })} />
      ))}
    </StepScreen>
  );
}
