import Slider from '@react-native-community/slider';
import { BUDGET_MAX, BUDGET_MIN, BUDGET_STEP, servingsFor, type HouseholdSize } from '@weekwell/domain';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { MIN_TOUCH, color, radius, space, type as typeScale } from '../theme/tokens';
import { Text } from './Text';

function clamp(n: number) {
  return Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, Math.round(n / BUDGET_STEP) * BUDGET_STEP));
}

/**
 * Slider plus editable number plus −/+ steps. Out-of-range input is corrected
 * on blur with a visible explanation (constraints + error prevention).
 */
export function BudgetControl({ value, onChange, householdSize }: { value: number; onChange: (n: number) => void; householdSize: HouseholdSize }) {
  // Text being typed; null when the field shows the committed value.
  const [draft, setDraft] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const text = draft ?? String(value);

  const commit = () => {
    if (draft === null) return;
    const n = Number(draft.replace(/[^0-9]/gu, ''));
    setDraft(null);
    if (!Number.isFinite(n) || n === 0) {
      setNote(`Enter a whole-dollar amount between $${BUDGET_MIN} and $${BUDGET_MAX}.`);
      return;
    }
    const c = clamp(n);
    if (n < BUDGET_MIN) setNote(`Budgets start at $${BUDGET_MIN}. We set it to $${c}.`);
    else if (n > BUDGET_MAX) setNote(`Budgets go up to $${BUDGET_MAX}. We set it to $${c}.`);
    else if (c !== n) setNote(`We round to $${BUDGET_STEP} steps: $${c}.`);
    else setNote(null);
    onChange(c);
  };

  const servings = servingsFor(householdSize);
  const perMeal = value / (10 * servings); // 5 dinners + 5 lunches per person

  return (
    <View>
      <View style={styles.valueRow}>
        <Stepper label="−" a11y={`Decrease budget to $${clamp(value - BUDGET_STEP)}`} disabled={value <= BUDGET_MIN} onPress={() => onChange(clamp(value - BUDGET_STEP))} />
        <View style={styles.inputWrap}>
          <Text variant="title" style={styles.dollar} importantForAccessibility="no">$</Text>
          <TextInput
            testID="budget-input"
            accessibilityLabel="Weekly grocery budget in dollars"
            value={text}
            onChangeText={setDraft}
            onBlur={commit}
            onSubmitEditing={commit}
            keyboardType="number-pad"
            returnKeyType="done"
            maxLength={4}
            style={styles.input}
          />
        </View>
        <Stepper label="+" a11y={`Increase budget to $${clamp(value + BUDGET_STEP)}`} disabled={value >= BUDGET_MAX} onPress={() => onChange(clamp(value + BUDGET_STEP))} />
      </View>
      <Slider
        testID="budget-slider"
        accessibilityLabel="Weekly grocery budget"
        minimumValue={BUDGET_MIN}
        maximumValue={BUDGET_MAX}
        step={BUDGET_STEP}
        value={value}
        onValueChange={(v) => onChange(clamp(v))}
        minimumTrackTintColor={color.accent}
        maximumTrackTintColor={color.control}
        thumbTintColor={color.accent}
        style={styles.slider}
      />
      <View style={styles.bounds} importantForAccessibility="no-hide-descendants">
        <Text variant="meta" tone="muted">${BUDGET_MIN}</Text>
        <Text variant="meta" tone="muted">${BUDGET_MAX}</Text>
      </View>
      {note ? (
        <Text variant="meta" tone="warning" accessibilityLiveRegion="polite" style={{ marginTop: space.s }}>
          {note}
        </Text>
      ) : null}
      <Text tone="muted" style={{ marginTop: space.m }}>
        ${value} a week is about ${perMeal.toFixed(2)} per meal for {servings === 1 ? 'one person' : `${servings} people`}, across 5 dinners and 5 lunches.
      </Text>
    </View>
  );
}

function Stepper({ label, a11y, onPress, disabled }: { label: string; a11y: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.stepper, disabled && { opacity: 0.4 }, pressed && { backgroundColor: color.placeholder }]}
    >
      <Text variant="title">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  valueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.m },
  stepper: { width: MIN_TOUCH + 12, height: MIN_TOUCH + 12, borderRadius: radius.control, borderWidth: 1.5, borderColor: color.ink, alignItems: 'center', justifyContent: 'center' },
  inputWrap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: space.m, borderBottomWidth: 2, borderBottomColor: color.ink },
  dollar: { fontSize: 32, lineHeight: 44 },
  input: { ...typeScale.total, color: color.ink, width: 88, minWidth: 0, minHeight: MIN_TOUCH + 8, textAlign: 'left', paddingVertical: space.xs, paddingLeft: space.xs },
  slider: { width: '100%', height: MIN_TOUCH, marginTop: space.l },
  bounds: { flexDirection: 'row', justifyContent: 'space-between' },
});
