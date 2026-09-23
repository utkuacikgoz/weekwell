import { router, useLocalSearchParams, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { space } from '../theme/tokens';
import { Button } from './Button';
import { Screen, TopBar } from './Layout';
import { Text } from './Text';

export const ONBOARDING_STEPS = ['store', 'budget', 'goal', 'time', 'household', 'exclusions', 'review'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/**
 * One onboarding question per screen. When opened from the review screen
 * (`?edit=1`), Continue returns to review so edits are never a detour.
 */
export function StepScreen({
  step,
  title,
  intro,
  children,
  canContinue = true,
  continueLabel = 'Continue',
  onContinue,
  footerNote,
}: {
  step: OnboardingStep;
  title: string;
  intro?: string;
  children: ReactNode;
  canContinue?: boolean;
  continueLabel?: string;
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
          <Button label={edit === '1' ? 'Save and go back' : continueLabel} onPress={go} disabled={!canContinue} testID="continue" />
        </>
      }
    >
      <TopBar step={index + 1} total={ONBOARDING_STEPS.length} />
      <View style={{ marginTop: space.s, marginBottom: space.m }}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {intro ? (
          <Text tone="muted" style={{ marginTop: space.s }}>
            {intro}
          </Text>
        ) : null}
      </View>
      {children}
    </Screen>
  );
}
