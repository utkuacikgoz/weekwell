import { router, useLocalSearchParams, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { color, space } from '../theme/tokens';
import { Button } from './Button';
import { Screen } from './Layout';
import { NavBar } from './NavBar';
import { Text } from './Text';

export const ONBOARDING_STEPS = ['store', 'week', 'exclusions', 'review'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
export const STEP_NAME: Record<OnboardingStep, string> = { store: 'Store and budget', week: 'Your week', exclusions: 'Foods to leave out', review: 'Review' };

/** Plain-language progress: "Step 2 of 4 · Your week" with a thin bar. */
export function StepProgress({ step }: { step: OnboardingStep }) {
  const i = ONBOARDING_STEPS.indexOf(step);
  return (
    <View accessible accessibilityLabel={`Step ${i + 1} of ${ONBOARDING_STEPS.length}: ${STEP_NAME[step]}`} style={{ gap: space.s, marginBottom: space.m }}>
      <Text variant="meta" tone="muted">
        Step {i + 1} of {ONBOARDING_STEPS.length} · {STEP_NAME[step]}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${((i + 1) / ONBOARDING_STEPS.length) * 100}%` }]} />
      </View>
    </View>
  );
}

/**
 * One short setup step. When opened from review (`?edit=1`), the action
 * becomes "Save and go back" so edits are never a detour.
 */
export function StepScreen({
  step,
  title,
  children,
  canContinue = true,
  onContinue,
  footerNote,
}: {
  step: OnboardingStep;
  title: string;
  children: ReactNode;
  canContinue?: boolean;
  onContinue?: () => void;
  footerNote?: ReactNode;
}) {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const index = ONBOARDING_STEPS.indexOf(step);
  const next = ONBOARDING_STEPS[index + 1];
  const go = () => {
    onContinue?.();
    if (edit === '1') router.back();
    else if (next) router.push(`/onboarding/${next}` as Href);
  };
  return (
    <Screen
      footer={
        <>
          {footerNote}
          <Button label={edit === '1' ? 'Save and go back' : 'Continue'} onPress={go} disabled={!canContinue} testID="continue" />
        </>
      }
    >
      <NavBar backLabel={index === 0 ? 'Welcome' : STEP_NAME[ONBOARDING_STEPS[index - 1] ?? 'store']} />
      <StepProgress step={step} />
      <Text variant="title" accessibilityRole="header" style={{ marginBottom: space.l }}>
        {title}
      </Text>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  track: { height: 4, borderRadius: 2, backgroundColor: color.divider, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: color.accent },
});
