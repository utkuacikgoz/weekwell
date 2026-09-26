import { RETAILERS, RETAILER_LABEL } from '@weekwell/domain';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BudgetControl, budgetExplainer } from '../../components/BudgetControl';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { ChoiceGroup } from '../../components/Segmented';
import { Sheet } from '../../components/Sheet';
import { StepScreen } from '../../components/StepScreen';
import { Text } from '../../components/Text';
import { STORE_COPY } from '../../copy';
import { useStore } from '../../state/store';
import { MIN_TOUCH, color, space } from '../../theme/tokens';

/**
 * Setup 1, "fill in the sentence" (D-040 SB3): "I shop at [store] and spend
 * about [$80] a week." Each blank opens a sheet with the full choice.
 */
export default function StoreAndBudget() {
  const { data, setDraft, analytics } = useStore();
  const selected = data.draft.retailer;
  const budget = data.draft.weeklyBudget;
  const [open, setOpen] = useState<'store' | 'budget' | null>(null);

  return (
    <StepScreen step="store" canContinue={selected !== null} onContinue={() => selected && analytics?.track('store_selected', { retailer: selected })}>
      <View style={styles.sentence} accessibilityRole="header" accessibilityLabel={`I shop at ${selected ? RETAILER_LABEL[selected] : 'a store you choose'} and spend about $${budget} a week.`}>
        <Words text="I shop at" />
        <Blank label={selected ? RETAILER_LABEL[selected] : 'your store'} empty={!selected} a11y={selected ? `Store: ${RETAILER_LABEL[selected]}. Change` : 'Choose your store'} onPress={() => setOpen('store')} testID="store-pick" />
        <Words text="and spend about" />
        <Blank label={`$${budget}`} a11y={`Weekly budget: $${budget}. Change`} onPress={() => setOpen('budget')} testID="budget-pick" />
        <Words text="a week." />
      </View>
      <Text tone="muted" testID="budget-explainer">
        {budgetExplainer(budget, data.draft.householdSize, false)}
      </Text>
      {selected ? (
        <Text variant="meta" tone="muted" style={{ marginTop: space.s }}>
          {STORE_COPY[selected].detail}
        </Text>
      ) : null}

      <Sheet visible={open === 'store'} title="Where do you shop?" onClose={() => setOpen(null)} testID="store-sheet">
        <ChoiceGroup
          label="Store"
          columns={1}
          value={selected ?? ('' as never)}
          onChange={(r) => {
            setDraft({ retailer: r });
            setOpen(null);
          }}
          options={RETAILERS.map((r) => ({ value: r, label: RETAILER_LABEL[r], detail: STORE_COPY[r].detail, testID: `store-${r}` }))}
        />
      </Sheet>
      <Sheet
        visible={open === 'budget'}
        title="Weekly grocery budget"
        onClose={() => setOpen(null)}
        testID="budget-sheet"
        footer={<Button label="Done" onPress={() => setOpen(null)} testID="budget-done" />}
      >
        <BudgetControl value={budget} householdSize={data.draft.householdSize} householdKnown={false} onChange={(weeklyBudget) => setDraft({ weeklyBudget })} />
      </Sheet>
    </StepScreen>
  );
}

/** Each word is its own box so the sentence wraps between words around the blanks. */
function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <Text key={i} variant="title" importantForAccessibility="no" accessibilityElementsHidden>
          {w}
        </Text>
      ))}
    </>
  );
}

function Blank({ label, a11y, onPress, testID, empty }: { label: string; a11y: string; onPress: () => void; testID: string; empty?: boolean }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} style={({ pressed }) => [styles.blank, empty && styles.blankEmpty, pressed && { opacity: 0.8 }]}>
      <Text variant="title" tone={empty ? 'ink' : 'onAccent'} style={{ flexShrink: 1 }}>
        {label}
      </Text>
      <Icon name="chevron-down" size={20} strokeWidth={3} color={empty ? color.ink : color.onAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sentence: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.s, rowGap: space.s, marginBottom: space.l },
  blank: { minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.s + 2, paddingVertical: 2, backgroundColor: color.accent, maxWidth: '100%' },
  blankEmpty: { backgroundColor: 'transparent', borderWidth: 2, borderStyle: 'dashed', borderColor: color.ink },
});
