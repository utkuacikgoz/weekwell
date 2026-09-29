import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { ExclusionsEditor } from '../../components/ExclusionsEditor';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { StepScreen } from '../../components/StepScreen';
import { Text } from '../../components/Text';
import { useStore } from '../../state/store';
import { color, space } from '../../theme/tokens';

/** How the foods you leave out are used (D-048 FL1): three short lines, no web link. */
const HANDLING = ['Stays on this phone.', 'Only used to plan your meals.', 'Never sold. Delete it anytime in Settings.'] as const;

export default function FoodsToLeaveOut() {
  const { data, setDraft } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <StepScreen step="exclusions" title="Anything you don’t eat?">
      <ExclusionsEditor value={data.draft.exclusions} maxMinutes={data.draft.maxMinutes} onChange={(exclusions) => setDraft({ exclusions })} />
      {/* Consumer health data notice (docs/legal/us-legal-review.md): adding a food is the user's choice to share it. */}
      <Text variant="meta" tone="muted" style={{ marginTop: space.m }} testID="health-data-notice">
        Allergies count as health info. Yours stays on this phone and only shapes your meals.
      </Text>
      <Button kind="quiet" label="How we use this" onPress={() => setOpen(true)} testID="health-data-open" />
      <Sheet visible={open} title="Your food list" onClose={() => setOpen(false)} testID="health-data-sheet" footer={<Button label="Got it" onPress={() => setOpen(false)} testID="health-data-close" />}>
        {HANDLING.map((line) => (
          <View key={line} style={styles.point}>
            <Icon name="check" size={18} color={color.accent} strokeWidth={2.6} />
            <Text style={{ flex: 1 }}>{line}</Text>
          </View>
        ))}
      </Sheet>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  point: { flexDirection: 'row', alignItems: 'center', gap: space.s },
});
