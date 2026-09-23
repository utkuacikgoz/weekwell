import { PROTEIN_GOALS, type HouseholdSize, type MaxMinutes } from '@weekwell/domain';
import { ChoiceGroup } from '../../components/Segmented';
import { StepScreen } from '../../components/StepScreen';
import { GOAL_COPY, householdCopy, timeCopy } from '../../copy';
import { useStore } from '../../state/store';

const TIMES: MaxMinutes[] = [20, 30, 'batch'];
const PEOPLE: HouseholdSize[] = [1, 2, '3_4'];

export default function YourWeek() {
  const { data, setDraft } = useStore();
  const d = data.draft;
  return (
    <StepScreen step="week" title="How do you like to eat this week?">
      <ChoiceGroup
        label="Main goal"
        columns={2}
        value={d.proteinGoal}
        onChange={(proteinGoal) => setDraft({ proteinGoal })}
        options={PROTEIN_GOALS.map((g) => ({ value: g, label: GOAL_COPY[g].label, testID: `goal-${g}` }))}
      />
      <ChoiceGroup
        label="Time for dinner"
        value={String(d.maxMinutes)}
        onChange={(v) => setDraft({ maxMinutes: v === 'batch' ? 'batch' : (Number(v) as 20 | 30) })}
        options={TIMES.map((m) => ({ value: String(m), label: timeCopy(m).short === 'Batch' ? 'Batch cook' : timeCopy(m).short, testID: `time-${m}` }))}
      />
      <ChoiceGroup
        label="People eating"
        value={String(d.householdSize)}
        onChange={(v) => setDraft({ householdSize: v === '3_4' ? '3_4' : (Number(v) as 1 | 2) })}
        options={PEOPLE.map((h) => ({ value: String(h), label: householdCopy(h).label, testID: `household-${h}` }))}
      />
    </StepScreen>
  );
}
