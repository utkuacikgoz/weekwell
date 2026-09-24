import { BUDGET_MAX, BUDGET_MIN, BUDGET_STEP, servingsFor, type HouseholdSize } from '@weekwell/domain';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { MIN_TOUCH, color, radius, space, type as typeScale } from '../theme/tokens';
import { ChoiceGroup } from './Segmented';
import { Text, useTextScale } from './Text';

export const BUDGET_PRESETS = [60, 80, 100] as const;

function clamp(n: number) {
  return Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, Math.round(n / BUDGET_STEP) * BUDGET_STEP));
}

/**
 * Three presets and Custom (design audit 2026-09-24). The −/+ stepper and the
 * number field appear only for Custom. Out-of-range input is corrected on
 * blur with a visible explanation.
 *
 * `householdKnown`: in onboarding the number of people comes on the next
 * step, so the explanation says so instead of guessing.
 */
export function BudgetControl({ value, onChange, householdSize, householdKnown = true }: { value: number; onChange: (n: number) => void; householdSize: HouseholdSize; householdKnown?: boolean }) {
  const [custom, setCustom] = useState(() => !(BUDGET_PRESETS as readonly number[]).includes(value));
  // Text being typed; null when the field shows the committed value.
  const [draft, setDraft] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const text = draft ?? String(value);
  // Four across only when each option has room for its label and tick; otherwise two by two.
  const { width } = useWindowDimensions();
  const textScale = useTextScale();
  const wide = width >= 480 && textScale <= 1.2;

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
  const who = servings === 1 ? 'one person' : `${servings} people`;

  return (
    <View>
      <ChoiceGroup
        label="Weekly grocery budget"
        columns={wide ? 4 : 2}
        value={custom ? 'custom' : String(value)}
        onChange={(v) => {
          setNote(null);
          if (v === 'custom') setCustom(true);
          else {
            setCustom(false);
            onChange(Number(v));
          }
        }}
        options={[...BUDGET_PRESETS.map((n) => ({ value: String(n), label: `$${n}`, testID: `budget-${n}` })), { value: 'custom', label: 'Custom', testID: 'budget-custom' }]}
      />
      {custom ? (
        <View style={styles.valueRow} testID="budget-custom-editor">
          <Stepper label="−" a11y={`Decrease budget to $${clamp(value - BUDGET_STEP)}`} disabled={value <= BUDGET_MIN} onPress={() => onChange(clamp(value - BUDGET_STEP))} />
          <View style={styles.inputWrap}>
            <Text variant="heading" importantForAccessibility="no">$</Text>
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
      ) : null}
      {note ? (
        <Text variant="meta" tone="warning" accessibilityLiveRegion="polite" style={{ marginTop: space.s }}>
          {note}
        </Text>
      ) : null}
      <Text variant="meta" tone="muted" style={{ marginTop: custom ? space.m : 0 }} testID="budget-explainer">
        {householdKnown
          ? `$${value} a week is about $${perMeal.toFixed(2)} a meal for ${who}, across 5 dinners and 5 lunches.`
          : `$${value} a week covers 5 dinners and 5 lunches: about $${(value / 10).toFixed(2)} a meal for one person. You’ll say who’s eating next, and we’ll check the fit before planning.`}
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
      <Text variant="heading">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: -space.s },
  stepper: { width: MIN_TOUCH + 4, height: MIN_TOUCH + 4, borderRadius: radius.control, borderWidth: 1.5, borderColor: color.control, alignItems: 'center', justifyContent: 'center' },
  inputWrap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: color.ink },
  input: { ...typeScale.heading, color: color.ink, width: 72, minWidth: 0, minHeight: MIN_TOUCH, textAlign: 'left', paddingVertical: space.xs, paddingLeft: space.xs },
});
