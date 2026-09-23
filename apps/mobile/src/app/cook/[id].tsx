import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Layout';
import { NavBar } from '../../components/NavBar';
import { Text } from '../../components/Text';
import { useStore } from '../../state/store';
import { color, space } from '../../theme/tokens';

/**
 * Cooking mode: one step at a time, large text, readable at arm's length.
 * No timers or sounds in this version.
 */
export default function Cook() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStore();
  const [step, setStep] = useState(0);
  const meal = data.plan ? [...data.plan.dinners, ...data.plan.lunches].find((m) => m.id === id) : undefined;
  if (!meal) return <Redirect href="/week" />;
  const total = meal.steps.length;
  const last = step === total - 1;

  return (
    <Screen
      testID="cook-screen"
      footer={
        <View style={styles.footer}>
          <View style={{ flex: 1 }}>
            <Button label="Back" kind="secondary" disabled={step === 0} onPress={() => setStep((s) => Math.max(0, s - 1))} testID="cook-prev" />
          </View>
          <View style={{ flex: 2 }}>
            <Button label={last ? 'Done' : 'Next step'} onPress={() => (last ? router.back() : setStep((s) => s + 1))} testID="cook-next" />
          </View>
        </View>
      }
    >
      <NavBar backLabel="Recipe" />
      <Text variant="label" tone="muted">{meal.name}</Text>
      <View style={styles.progressRow} accessible accessibilityLabel={`Step ${step + 1} of ${total}`}>
        <Text variant="bodyStrong" tone="accent" testID="cook-step-count">Step {step + 1} of {total}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${((step + 1) / total) * 100}%` }]} />
        </View>
      </View>
      <Text style={styles.stepText} accessibilityLiveRegion="polite" testID="cook-step">
        {meal.steps[step]}
      </Text>
      {step + 1 < total ? (
        <View style={{ marginTop: space.xl }}>
          <Text variant="label" tone="muted">Next</Text>
          <Text tone="muted">{meal.steps[step + 1]}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressRow: { gap: space.s, marginTop: space.l, marginBottom: space.l },
  track: { height: 6, borderRadius: 3, backgroundColor: color.divider, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: color.accent },
  stepText: { fontSize: 24, lineHeight: 32 },
  footer: { flexDirection: 'row', gap: space.s },
});
