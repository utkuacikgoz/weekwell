import { ExclusionsEditor } from '../../components/ExclusionsEditor';
import { StepScreen } from '../../components/StepScreen';
import { useStore } from '../../state/store';

export default function ExclusionsStep() {
  const { data, setDraft } = useStore();
  return (
    <StepScreen step="exclusions" title="Anything to leave out?" intro="Allergies, or foods you just don’t eat.">
      <ExclusionsEditor value={data.draft.exclusions} maxMinutes={data.draft.maxMinutes} onChange={(exclusions) => setDraft({ exclusions })} />
    </StepScreen>
  );
}
