import type { MaxMinutes } from '@weekwell/domain';
import { ChoiceRow } from '../../components/ChoiceRow';
import { StepScreen } from '../../components/StepScreen';
import { timeCopy } from '../../copy';
import { useStore } from '../../state/store';

const OPTIONS: MaxMinutes[] = [20, 30, 'batch'];

export default function TimeStep() {
  const { data, setDraft } = useStore();
  return (
    <StepScreen step="time" title="How long can dinner take?" intro="Total time from starting to eating.">
      {OPTIONS.map((m) => (
        <ChoiceRow key={String(m)} testID={`time-${m}`} label={timeCopy(m).label} detail={timeCopy(m).detail} selected={data.draft.maxMinutes === m} onPress={() => setDraft({ maxMinutes: m })} />
      ))}
    </StepScreen>
  );
}
