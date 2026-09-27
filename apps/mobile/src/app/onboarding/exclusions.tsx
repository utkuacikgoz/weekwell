import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { ExclusionsEditor } from '../../components/ExclusionsEditor';
import { Sheet } from '../../components/Sheet';
import { StepScreen } from '../../components/StepScreen';
import { Text } from '../../components/Text';
import { useStore } from '../../state/store';
import { color, space } from '../../theme/tokens';

/** How the foods you leave out are used, said in the app instead of sending people to the website. */
const HANDLING = [
  ['Stays on your phone', 'No account, no Weekwell server. Your list never leaves this device.'],
  ['Used for one thing', 'Keeping those foods out of your meals and your grocery list.'],
  ['Never sold or shared', 'Not for ads, not for anyone else.'],
  ['Yours to delete', 'Switch a food off here any time, or erase everything in Settings → Delete my data.'],
] as const;

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
        {HANDLING.map(([head, body]) => (
          <View key={head} style={styles.point}>
            <Text variant="bodyStrong">{head}</Text>
            <Text tone="muted">{body}</Text>
          </View>
        ))}
        <Text variant="meta" tone="muted">Full policy: weekwell.pro/health-data</Text>
      </Sheet>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  point: { borderLeftWidth: 3, borderLeftColor: color.accent, paddingLeft: space.m, gap: 2 },
});
