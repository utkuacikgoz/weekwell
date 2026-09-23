import { DAY_LABEL, RETAILER_LABEL, getProduct, type Day, type EntitlementView } from '@weekwell/domain';
import { Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { Screen, SectionLabel } from '../components/Layout';
import { MealRow, mealWhen } from '../components/MealRow';
import { PriceSummary } from '../components/PriceSummary';
import { Text } from '../components/Text';
import { GOAL_COPY, householdCopy, timeCopy, weekSummary } from '../copy';
import { useStore } from '../state/store';
import { MIN_TOUCH, color, space } from '../theme/tokens';

const WEEKDAYS: (Day | null)[] = [null, 'mon', 'tue', 'wed', 'thu', 'fri', null];

function tonight(now: Date): { day: Day; label: string } {
  const d = WEEKDAYS[now.getDay()];
  return d ? { day: d, label: 'Tonight' } : { day: 'mon', label: 'Next up: Monday' };
}

function subscriptionLine(view: EntitlementView): string | null {
  switch (view.state) {
    case 'trial':
      return `Free week · ${view.daysLeft} day${view.daysLeft === 1 ? '' : 's'} left`;
    case 'active':
      return `${getProduct(view.productId).label} plan${view.willRenew ? '' : ' · ends soon'}`;
    case 'expired':
      return 'Your free week has ended';
    default:
      return null;
  }
}

export default function Week() {
  const { data, priceCheck, groceryItems, entitlementView } = useStore();
  const plan = data.plan;
  if (!plan) return <Redirect href="/onboarding" />;
  const p = plan.preferences;
  const next = tonight(new Date());
  const tonightMeal = plan.dinners.find((d) => d.day === next.day);
  const checkedCount = data.checked.filter((id) => groceryItems.some((g) => g.id === id)).length;
  const sub = subscriptionLine(entitlementView);

  return (
    <Screen
      footer={
        <Button
          label={`Open grocery list · ${checkedCount} of ${groceryItems.length} checked`}
          onPress={() => router.push('/grocery')}
          testID="open-grocery"
        />
      }
    >
      {/* Recognition over recall: settings stay visible and editable. */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="heading">{RETAILER_LABEL[p.retailer]}</Text>
          <Text variant="meta" tone="muted" testID="settings-summary">
            ${p.weeklyBudget} budget · {GOAL_COPY[p.proteinGoal].label} · {timeCopy(p.maxMinutes).short} · {householdCopy(p.householdSize).label}
            {p.exclusions.length ? ` · ${p.exclusions.length} excluded` : ''}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Edit preferences" onPress={() => router.push('/preferences')} style={styles.edit} testID="edit-preferences">
          <Text variant="bodyStrong" tone="accent" style={{ textDecorationLine: 'underline' }}>Edit</Text>
        </Pressable>
      </View>

      <Text variant="title" accessibilityRole="header" style={{ marginTop: space.m }}>
        Your week is ready.
      </Text>
      <Text variant="meta" tone="muted" testID="week-summary">
        {weekSummary(plan.dinners)}
      </Text>

      <View style={{ marginTop: space.m }}>
        <PriceSummary priceCheck={priceCheck} budget={p.weeklyBudget} />
      </View>

      {tonightMeal ? (
        <>
          <SectionLabel>{next.label}</SectionLabel>
          <MealRow meal={tonightMeal} label={DAY_LABEL[tonightMeal.day]} onList={!data.skippedMealIds.includes(tonightMeal.id)} emphasis />
        </>
      ) : null}

      <SectionLabel>Dinners</SectionLabel>
      {plan.dinners
        .filter((d) => d.id !== tonightMeal?.id)
        .map((d) => (
          <MealRow key={d.id} meal={d} label={DAY_LABEL[d.day]} onList={!data.skippedMealIds.includes(d.id)} />
        ))}

      <SectionLabel>Work lunches</SectionLabel>
      {plan.lunches.map((l) => (
        <MealRow key={l.id} meal={l} label={mealWhen(l)} onList={!data.skippedMealIds.includes(l.id)} />
      ))}

      <Text variant="meta" tone="muted" style={{ marginTop: space.m }}>
        Protein is estimated from typical ingredient values. Weekwell is not medical or dietary advice.
      </Text>

      <View style={styles.sub}>
        {sub ? <Text variant="meta" tone="muted" testID="subscription-status">{sub}</Text> : null}
        <Pressable accessibilityRole="button" onPress={() => router.push('/trial?trigger=plan_header')} style={styles.edit} testID="open-trial">
          <Text variant="bodyStrong" tone="accent" style={{ textDecorationLine: 'underline' }}>
            {entitlementView.state === 'trial' || entitlementView.state === 'active' ? 'Manage subscription' : 'Try a free week'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: space.m, paddingBottom: space.s, borderBottomWidth: 1, borderBottomColor: color.divider },
  edit: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: 'center', alignItems: 'flex-end' },
  sub: { marginTop: space.l, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
});
