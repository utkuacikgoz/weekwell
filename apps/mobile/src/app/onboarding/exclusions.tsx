import { ExclusionsEditor } from '../../components/ExclusionsEditor';
import { LegalLinks } from '../../components/LegalLinks';
import { StepScreen } from '../../components/StepScreen';
import { Text } from '../../components/Text';
import { useStore } from '../../state/store';
import { space } from '../../theme/tokens';

export default function FoodsToLeaveOut() {
  const { data, setDraft } = useStore();
  return (
    <StepScreen step="exclusions" title="Any foods to leave out?">
      <ExclusionsEditor value={data.draft.exclusions} maxMinutes={data.draft.maxMinutes} onChange={(exclusions) => setDraft({ exclusions })} />
      {/* Consumer health data notice (docs/legal/us-legal-review.md): adding a food is the user's choice to share it. */}
      <Text variant="meta" tone="muted" style={{ marginTop: space.m }} testID="health-data-notice">
        Allergies can be health information. We use the foods you leave out only to plan your meals, and never for ads.
      </Text>
      <LegalLinks pages={[{ page: 'health-data', label: 'How we handle this' }]} />
    </StepScreen>
  );
}
