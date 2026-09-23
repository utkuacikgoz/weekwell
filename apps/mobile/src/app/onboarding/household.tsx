import type { HouseholdSize } from '@weekwell/domain';
import { ChoiceRow } from '../../components/ChoiceRow';
import { StepScreen } from '../../components/StepScreen';
import { householdCopy } from '../../copy';
import { useStore } from '../../state/store';

const OPTIONS: HouseholdSize[] = [1, 2, '3_4'];

export default function HouseholdStep() {
  const { data, setDraft } = useStore();
  return (
    <StepScreen step="household" title="How many people are eating?" intro="We scale quantities and the grocery list to match.">
      {OPTIONS.map((h) => (
        <ChoiceRow key={String(h)} testID={`household-${h}`} label={householdCopy(h).label} detail={householdCopy(h).detail} selected={data.draft.householdSize === h} onPress={() => setDraft({ householdSize: h })} />
      ))}
    </StepScreen>
  );
}
