import { RETAILER_LABEL, checkFeasibility, exclusionLabel } from '@weekwell/domain';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Banner } from '../../components/Banner';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Layout';
import { NavBar } from '../../components/NavBar';
import { StepProgress, STEP_NAME, type OnboardingStep } from '../../components/StepScreen';
import { Text } from '../../components/Text';
import { GOAL_COPY, householdCopy, timeCopy } from '../../copy';
import { isCompleteDraft, useStore } from '../../state/store';
import { MIN_TOUCH, color, radius, space } from '../../theme/tokens';

export default function Review() {
  const { data, remote, signedIn } = useStore();
  const d = data.draft;
  const feasibility = checkFeasibility(d);
  const ready = isCompleteDraft(d) && feasibility.ok;

  const rows: [string, string, OnboardingStep, string][] = [
    ['Store and budget', `${d.retailer ? RETAILER_LABEL[d.retailer] : 'No store chosen'} · $${d.weeklyBudget} a week`, 'store', 'review-store'],
    ['Your week', `${GOAL_COPY[d.proteinGoal].label} · ${timeCopy(d.maxMinutes).label} · ${householdCopy(d.householdSize).label}`, 'week', 'review-week'],
    ['Foods to leave out', d.exclusions.length ? d.exclusions.map(exclusionLabel).join(', ') : 'Nothing left out', 'exclusions', 'review-exclusions'],
  ];

  return (
    <Screen footer={<Button label="Plan my five dinners" onPress={() => router.push(remote && !signedIn ? '/sign-in' : '/generating')} disabled={!ready} testID="generate" />}>
      <NavBar backLabel={STEP_NAME.exclusions} />
      <StepProgress step="review" />
      <Text variant="title" accessibilityRole="header">Ready to plan your week</Text>
      <Text tone="muted" style={{ marginTop: space.s, marginBottom: space.l }}>
        Five dinners and two lunch preps, with one grocery list. Tap anything to change it.
      </Text>
      {rows.map(([label, value, step, testID]) => (
        <Pressable
          key={label}
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value}. Change`}
          onPress={() => router.push(`/onboarding/${step}?edit=1` as Href)}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.placeholder }]}
        >
          <View style={{ flex: 1 }}>
            <Text variant="meta" tone="muted">{label}</Text>
            <Text variant="bodyStrong">{value}</Text>
          </View>
          <Text variant="label" tone="accent">Change</Text>
          <Icon name="chevron-right" size={16} color={color.accent} />
        </Pressable>
      ))}
      {!isCompleteDraft(d) ? <Banner tone="warning" title="Choose a store to continue." /> : null}
      {!feasibility.ok ? (
        <Banner tone="warning" title="Not enough meals for a full week" testID="review-conflict">
          <Text>{feasibility.message}</Text>
          {feasibility.suggestions.map((s) => (
            <Text key={s}>• {s}</Text>
          ))}
        </Banner>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: MIN_TOUCH + 24, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingVertical: space.s, paddingHorizontal: space.m - 4, marginBottom: space.s, backgroundColor: color.raised, borderRadius: radius.control },
});
