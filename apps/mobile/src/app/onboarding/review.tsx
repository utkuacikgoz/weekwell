import { RETAILER_LABEL, checkFeasibility, exclusionLabel } from '@weekwell/domain';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Banner } from '../../components/Banner';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Layout';
import { NavBar } from '../../components/NavBar';
import { StepProgress, STEP_NAME, type OnboardingStep } from '../../components/StepScreen';
import { Icon } from '../../components/Icon';
import { Text } from '../../components/Text';
import { BANDS } from '../../components/WeekParts';
import { dollars } from '../../components/BudgetControl';
import { GOAL_COPY, householdCopy, timeCopy } from '../../copy';
import { isCompleteDraft, useStore } from '../../state/store';
import { MIN_TOUCH, radius, space } from '../../theme/tokens';

export default function Review() {
  const { data, remote, signedIn } = useStore();
  const d = data.draft;
  const feasibility = checkFeasibility(d);
  const ready = isCompleteDraft(d) && feasibility.ok;

  const rows: [string, string, OnboardingStep, string][] = [
    ['You shop at', `${d.retailer ? RETAILER_LABEL[d.retailer] : 'Pick a store'} · ${dollars(d.weeklyBudget)} a week`, 'store', 'review-store'],
    ['You want', `${GOAL_COPY[d.proteinGoal].label} · ${timeCopy(d.maxMinutes).label}`, 'week', 'review-week'],
    ['Cooking for', householdCopy(d.householdSize).label, 'week', 'review-household'],
    ['Your rules', d.exclusions.length ? d.exclusions.map(exclusionLabel).join(', ') : 'Anything goes', 'exclusions', 'review-exclusions'],
  ];

  return (
    <Screen footer={<Button label="Plan my week" onPress={() => router.push(remote && !signedIn ? '/sign-in' : '/generating')} disabled={!ready} testID="generate" />}>
      <NavBar backLabel={STEP_NAME.exclusions} />
      <StepProgress step="review" />
      <Text variant="title" accessibilityRole="header">Here’s your week.</Text>
      <Text tone="muted" style={{ marginTop: space.s, marginBottom: space.l }}>
        Five dinners, two lunch preps, one grocery list. Tap a card to change it.
      </Text>
      {rows.map(([label, value, step, testID], i) => (
        <Pressable
          key={label}
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value}. Edit`}
          onPress={() => router.push(`/onboarding/${step}?edit=1` as Href)}
          style={({ pressed }) => [styles.row, { backgroundColor: BANDS[i % BANDS.length] }, pressed && { opacity: 0.85 }]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="caption" style={styles.kicker}>{label}</Text>
            <Text variant="dish" style={styles.onBand}>{value}</Text>
          </View>
          <View style={styles.edit}>
            <Icon name="edit" size={18} color={ON_BAND} />
          </View>
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

/** White passes 4.5:1 on every day band (palette.ts). */
const ON_BAND = '#FFFFFF';

const styles = StyleSheet.create({
  // Full-bleed colour blocks, one per answer, like the days on the week screen.
  row: { minHeight: MIN_TOUCH + 40, flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m, paddingHorizontal: space.m + 4, marginHorizontal: -(space.m + 4), borderRadius: radius.card },
  kicker: { color: ON_BAND, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 1.2 },
  onBand: { color: ON_BAND },
  edit: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, backgroundColor: 'rgba(0,0,0,0.22)', alignItems: 'center', justifyContent: 'center' },
});
