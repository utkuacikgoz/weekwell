import { checkFeasibility, exclusionLabel } from '@weekwell/domain';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Banner } from '../../components/Banner';
import { Button } from '../../components/Button';
import { Screen, TopBar } from '../../components/Layout';
import { ONBOARDING_STEPS } from '../../components/StepScreen';
import { Text } from '../../components/Text';
import { GOAL_COPY, STORE_COPY, householdCopy, timeCopy } from '../../copy';
import { isCompleteDraft, useStore } from '../../state/store';
import { MIN_TOUCH, color, space } from '../../theme/tokens';

export default function Review() {
  const { data } = useStore();
  const d = data.draft;
  const feasibility = checkFeasibility(d);
  const ready = isCompleteDraft(d) && feasibility.ok;

  const rows: [string, string, (typeof ONBOARDING_STEPS)[number]][] = [
    ['Store', d.retailer ? STORE_COPY[d.retailer].label : 'Not chosen', 'store'],
    ['Weekly budget', `$${d.weeklyBudget}`, 'budget'],
    ['Main goal', GOAL_COPY[d.proteinGoal].label, 'goal'],
    ['Cooking time', timeCopy(d.maxMinutes).label, 'time'],
    ['Household', householdCopy(d.householdSize).label, 'household'],
    ['Leave out', d.exclusions.length ? d.exclusions.map(exclusionLabel).join(', ') : 'No exclusions', 'exclusions'],
  ];

  return (
    <Screen
      footer={<Button label="Plan my five dinners" onPress={() => router.push('/generating')} disabled={!ready} testID="generate" />}
    >
      <TopBar step={ONBOARDING_STEPS.length} total={ONBOARDING_STEPS.length} />
      <Text variant="title" accessibilityRole="header" style={{ marginTop: space.s }}>
        Check your choices
      </Text>
      <Text tone="muted" style={{ marginTop: space.s, marginBottom: space.m }}>
        Tap any line to change it.
      </Text>
      {rows.map(([label, value, step]) => (
        <Pressable
          key={label}
          testID={`review-${step}`}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value}. Edit`}
          onPress={() => router.push(`/onboarding/${step}?edit=1` as Href)}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.placeholder }]}
        >
          <View style={{ flex: 1 }}>
            <Text variant="meta" tone="muted">{label}</Text>
            <Text variant="bodyStrong">{value}</Text>
          </View>
          <Text variant="bodyStrong" tone="accent" style={{ textDecorationLine: 'underline' }}>Edit</Text>
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
  row: { minHeight: MIN_TOUCH + 20, flexDirection: 'row', alignItems: 'center', paddingVertical: space.s, borderBottomWidth: 1, borderBottomColor: color.divider },
});
