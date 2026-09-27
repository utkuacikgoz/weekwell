import { BUDGET_MAX, BUDGET_MIN, BUDGET_STEP, servingsFor, type HouseholdSize } from '@weekwell/domain';
import { useEffect, useRef, useState } from 'react';
import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { MIN_TOUCH, color, radius, space, type as typeScale } from '../theme/tokens';
import { ChoiceGroup } from './Segmented';
import { Text, useTextScale } from './Text';

export const BUDGET_PRESETS = [60, 80, 100] as const;

/** Whole dollars with thousands separators: $80, $1,200. */
export const dollars = (n: number) => `$${n.toLocaleString('en-US')}`;

/** $8 or $8.50: no ".00" on round amounts. */
const perMealText = (n: number) => (Number.isInteger(Math.round(n * 100) / 100) ? `$${Math.round(n)}` : `$${n.toFixed(2)}`);

/** What a budget buys, in meals (5 dinners and 5 lunches a person). Before "Who’s eating?" is answered, it's per person and says so. */
export function budgetExplainer(value: number, householdSize: HouseholdSize, householdKnown = true): string {
  if (!householdKnown) return `About ${perMealText(value / 10)} a meal for one, across 5 dinners and 5 lunches. You’ll add who’s eating next.`;
  const servings = servingsFor(householdSize);
  const perMeal = perMealText(value / (10 * servings));
  return servings === 1 ? `About ${perMeal} a meal, across 5 dinners and 5 lunches.` : `About ${perMeal} a meal each for ${servings} people, across 5 dinners and 5 lunches.`;
}

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
const ACCESSORY_ID = 'budget-keyboard';

/** A typed amount that needs no correction, applied as it's typed. */
function exact(draft: string): number | null {
  const n = Number(draft.replace(/[^0-9]/gu, ''));
  return n >= BUDGET_MIN && n <= BUDGET_MAX && n % BUDGET_STEP === 0 ? n : null;
}

export function BudgetControl({ value, onChange, householdSize, householdKnown = true, explain = true, hideLabel = false }: { value: number; onChange: (n: number) => void; householdSize: HouseholdSize; householdKnown?: boolean; explain?: boolean; hideLabel?: boolean }) {
  const [custom, setCustom] = useState(() => !(BUDGET_PRESETS as readonly number[]).includes(value));
  // Text being typed; null when the field shows the committed value.
  const [draft, setDraft] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const text = draft ?? String(value);
  // Four across only when each option has room for its label and tick; otherwise two by two.
  const { width } = useWindowDimensions();
  const textScale = useTextScale();
  const wide = width >= 480 && textScale <= 1.2;

  // Tapping Custom puts the cursor in the field.
  const [focusInput, setFocusInput] = useState(false);
  const input = useRef<TextInput>(null);
  useEffect(() => {
    if (focusInput) input.current?.focus();
  }, [focusInput]);

  const type = (t: string) => {
    setDraft(t);
    setNote(null);
    // The number pad has no return key and a sheet can close without a blur, so
    // a valid amount takes effect while typing; corrections still wait for blur.
    const n = exact(t);
    if (n !== null && n !== value) onChange(n);
  };

  const commit = () => {
    if (draft === null) return;
    const n = Number(draft.replace(/[^0-9]/gu, ''));
    setDraft(null);
    if (!Number.isFinite(n) || n === 0) {
      setNote(`Type an amount from ${dollars(BUDGET_MIN)} to ${dollars(BUDGET_MAX)}.`);
      return;
    }
    const c = clamp(n);
    if (n < BUDGET_MIN) setNote(`Weekwell plans from ${dollars(BUDGET_MIN)} a week, so we set ${dollars(c)}.`);
    else if (n > BUDGET_MAX) setNote(`Weekwell plans up to ${dollars(BUDGET_MAX)} a week, so we set ${dollars(c)}.`);
    else if (c !== n) setNote(`Rounded to ${dollars(c)}. Budgets move in $${BUDGET_STEP} steps.`);
    else setNote(null);
    onChange(c);
  };

  return (
    <View>
      <ChoiceGroup
        label="Weekly grocery budget"
        hideLabel={hideLabel}
        columns={wide ? 4 : 2}
        value={custom ? 'custom' : String(value)}
        onChange={(v) => {
          setNote(null);
          if (v === 'custom') {
            setCustom(true);
            setFocusInput(true);
          }
          else {
            setCustom(false);
            setFocusInput(false);
            onChange(Number(v));
          }
        }}
        options={[...BUDGET_PRESETS.map((n) => ({ value: String(n), label: `$${n}`, testID: `budget-${n}` })), { value: 'custom', label: 'Custom', testID: 'budget-custom' }]}
      />
      {custom ? (
        <View style={styles.valueRow} testID="budget-custom-editor">
          <Stepper label="−" a11y={`Decrease budget to ${dollars(clamp(value - BUDGET_STEP))}`} disabled={value <= BUDGET_MIN} onPress={() => onChange(clamp(value - BUDGET_STEP))} />
          <View style={styles.inputWrap}>
            <Text variant="heading" importantForAccessibility="no">$</Text>
            <TextInput
              ref={input}
              testID="budget-input"
              accessibilityLabel="Weekly grocery budget in dollars"
              value={text}
              onChangeText={type}
              onBlur={commit}
              onSubmitEditing={commit}
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={4}
              style={styles.input}
              inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
            />
          </View>
          <Stepper label="+" a11y={`Increase budget to ${dollars(clamp(value + BUDGET_STEP))}`} disabled={value >= BUDGET_MAX} onPress={() => onChange(clamp(value + BUDGET_STEP))} />
        </View>
      ) : null}
      {custom && Platform.OS === 'ios' ? (
        // The iOS number pad has no return key: this bar above it closes the keyboard.
        <InputAccessoryView nativeID={ACCESSORY_ID}>
          <View style={styles.accessory}>
            <Pressable accessibilityRole="button" accessibilityLabel="Done typing budget" onPress={() => Keyboard.dismiss()} style={styles.accessoryButton} testID="budget-keyboard-done">
              <Text variant="bodyStrong" tone="accent">Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
      {note ? (
        <Text variant="meta" tone="warning" accessibilityLiveRegion="polite" style={{ marginTop: space.s }}>
          {note}
        </Text>
      ) : null}
      {explain ? (
        <Text variant="meta" tone="muted" style={{ marginTop: custom ? space.m : 0 }} testID="budget-explainer">
          {budgetExplainer(value, householdSize, householdKnown)}
        </Text>
      ) : null}
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
  accessory: { flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: color.raised, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.divider, paddingHorizontal: space.m },
  accessoryButton: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: space.s },
  input: { ...typeScale.heading, color: color.ink, width: 96, minWidth: 0, minHeight: MIN_TOUCH, textAlign: 'left', paddingVertical: space.xs, paddingLeft: space.xs },
});
