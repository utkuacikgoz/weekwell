import { ExclusionsEditor } from '../../components/ExclusionsEditor';
import { StepScreen } from '../../components/StepScreen';
import { useStore } from '../../state/store';

export default function FoodsToLeaveOut() {
  const { data, setDraft } = useStore();
  return (
    <StepScreen step="exclusions" title="Any foods to leave out?">
      <ExclusionsEditor value={data.draft.exclusions} maxMinutes={data.draft.maxMinutes} onChange={(exclusions) => setDraft({ exclusions })} />
    </StepScreen>
  );
}
