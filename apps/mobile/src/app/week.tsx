import { DAY_LABEL, RETAILER_LABEL, getProduct, type Day, type EntitlementView } from '@weekwell/domain';
import { Redirect, router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Layout';
import { LockedSheet } from '../components/LockedSheet';
import { AboutEstimateSheet, RebuildSheet } from '../components/PriceSheets';
import { PriceStatus } from '../components/PriceStatus';
import { Text } from '../components/Text';
import { TonightCard, WeekRow } from '../components/WeekParts';
import { GOAL_COPY, householdCopy, timeCopy } from '../copy';
import { canChangePlan } from '../services/access';
import { useStore } from '../state/store';
import { MIN_TOUCH, color, radius, space } from '../theme/tokens';

const WEEKDAYS: (Day | null)[] = [null, 'mon', 'tue', 'wed', 'thu', 'fri', null];

function subscriptionLine(view: EntitlementView): string | null {
  switch (view.state) {
    case 'trial':
      return `Free week · ${view.daysLeft} day${view.daysLeft === 1 ? '' : 's'} left`;
    case 'active':
      return `${getProduct(view.productId).label} plan`;
    case 'expired':
      return 'Your free week has ended';
    default:
      return null;
  }
}

export default function Week() {
  const { data, priceCheck, groceryItems, entitlementView, scenarios, refreshPrices, applyPlan, planUndo, undoPlanChange, dismissPlanUndo, setDraft } = useStore();
  const { width, height, fontScale } = useWindowDimensions();
  // Short screens or large text: keep the bottom bar small so tonight's meal stays in view.
  const compactFooter = height < 700 || fontScale * scenarios.fontScale > 1.2;
  const [sheet, setSheet] = useState<'about' | 'rebuild' | 'locked' | null>(null);
  const [lockedAction, setLockedAction] = useState('');
  const plan = data.plan;
  if (!plan) return <Redirect href="/onboarding" />;

  const p = plan.preferences;
  const weekday = scenarios.today ?? new Date().getDay();
  const tonightDay = WEEKDAYS[weekday];
  const tonight = plan.dinners.find((d) => d.day === (tonightDay ?? 'mon'));
  const tonightLabel = tonightDay ? `Tonight · ${DAY_LABEL[tonightDay]}` : 'Next up · Monday';
  const checkedCount = data.checked.filter((id) => groceryItems.some((g) => g.id === id)).length;
  const sub = subscriptionLine(entitlementView);
  const open = (id: string) => router.push(`/meal/${id}` as Href);
  const prices = priceCheck.status === 'done' ? priceCheck.prices : priceCheck.status === 'loading' ? priceCheck.previous : undefined;
  const cardWidth = Math.min(width, 560) - 2 * (space.m + 4);

  return (
    <Screen
      testID="week-screen"
      footer={
        <>
          <PriceStatus
            priceCheck={priceCheck}
            budget={p.weeklyBudget}
            compact={compactFooter}
            onAction={(a) => {
              if (a === 'refresh') void refreshPrices();
              else if (a === 'rebuild' && !canChangePlan(entitlementView)) {
                setLockedAction('rebuild your week');
                setSheet('locked');
              } else setSheet(a);
            }}
          />
          <Button
            label={checkedCount > 0 ? `Open grocery list · ${checkedCount} of ${groceryItems.length} checked` : 'Open grocery list'}
            onPress={() => router.push('/grocery')}
            testID="open-grocery"
          />
        </>
      }
    >
      {/* Recognition over recall: the settings that shaped the week, one tap to change. */}
      <Pressable
        testID="edit-preferences"
        accessibilityRole="button"
        accessibilityLabel={`${RETAILER_LABEL[p.retailer]}, $${p.weeklyBudget} budget, ${GOAL_COPY[p.proteinGoal].label}, ${timeCopy(p.maxMinutes).label}, ${householdCopy(p.householdSize).label}. Edit preferences`}
        onPress={() => router.push('/preferences')}
        style={({ pressed }) => [styles.context, pressed && { backgroundColor: color.placeholder }]}
      >
        <Text variant="meta" tone="muted" style={{ flex: 1 }} testID="settings-summary" numberOfLines={2}>
          <Text variant="label">{RETAILER_LABEL[p.retailer]}</Text>
          {` · $${p.weeklyBudget} · ${GOAL_COPY[p.proteinGoal].label} · ${timeCopy(p.maxMinutes).short} · ${householdCopy(p.householdSize).label}`}
        </Text>
        <Icon name="edit" size={18} color={color.accent} />
      </Pressable>

      {planUndo ? (
        <View style={styles.undo} accessibilityLiveRegion="polite" testID="plan-undo">
          <Icon name="check" size={20} color={color.accent} />
          <Text variant="meta" style={{ flex: 1 }}>{planUndo.message}</Text>
          <Pressable accessibilityRole="button" onPress={undoPlanChange} style={styles.undoBtn} testID="plan-undo-button">
            <Text variant="label" tone="accent">Undo</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={dismissPlanUndo} style={styles.undoBtn}>
            <Icon name="close" size={18} color={color.inkMuted} />
          </Pressable>
        </View>
      ) : null}

      <Text variant="title" accessibilityRole="header" style={styles.title}>
        Your week, well fed.
      </Text>

      {tonight ? <TonightCard meal={tonight} label={tonightLabel} width={cardWidth} compact={compactFooter} onPress={() => open(tonight.id)} /> : null}

      <Text variant="heading" accessibilityRole="header" style={styles.section}>
        This week
      </Text>
      {plan.dinners.map((d) => (
        <WeekRow key={d.id} meal={d} tonight={d.day === tonightDay} offList={data.skippedMealIds.includes(d.id)} onPress={() => open(d.id)} />
      ))}

      <Text variant="heading" accessibilityRole="header" style={styles.section}>
        Work lunches
      </Text>
      {plan.lunches.map((l) => (
        <WeekRow key={l.id} meal={l} offList={data.skippedMealIds.includes(l.id)} onPress={() => open(l.id)} />
      ))}

      <Text variant="meta" tone="muted" style={{ marginTop: space.l, marginBottom: space.l }}>
        Protein estimate · check package labels for exact values
      </Text>

      <Button
        kind="secondary"
        label="Plan a new week"
        testID="plan-new-week"
        onPress={() => {
          if (!canChangePlan(entitlementView)) {
            setLockedAction('plan a new week');
            setSheet('locked');
            return;
          }
          setDraft(p);
          router.push('/onboarding/review');
        }}
      />

      <View style={styles.sub}>
        {sub ? <Text variant="meta" tone="muted" testID="subscription-status" style={{ flex: 1 }}>{sub}</Text> : <View style={{ flex: 1 }} />}
        <Button
          kind="secondary"
          label={entitlementView.state === 'trial' || entitlementView.state === 'active' ? 'Manage subscription' : 'Try a free week'}
          onPress={() => router.push('/trial?trigger=plan_header')}
          testID="open-trial"
        />
      </View>

      <AboutEstimateSheet
        visible={sheet === 'about'}
        onClose={() => setSheet(null)}
        prices={prices}
        plan={plan}
        staples={groceryItems.filter((i) => i.staple).map((i) => i.name)}
        onRefresh={() => {
          setSheet(null);
          void refreshPrices();
        }}
      />
      <LockedSheet visible={sheet === 'locked'} onClose={() => setSheet(null)} action={lockedAction} />
      <RebuildSheet
        visible={sheet === 'rebuild'}
        onClose={() => setSheet(null)}
        plan={plan}
        onApply={(next, changed) => {
          setSheet(null);
          applyPlan(next, `Week rebuilt under budget · ${changed} meal${changed === 1 ? '' : 's'} changed`);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  context: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: MIN_TOUCH + 4, marginTop: space.s, paddingHorizontal: space.s, marginHorizontal: -space.s, borderRadius: radius.control },
  title: { marginTop: space.m, marginBottom: space.m },
  section: { marginTop: space.l + 4, marginBottom: space.xs },
  sub: { marginTop: space.l, flexDirection: 'row', alignItems: 'center', gap: space.m },
  undo: { flexDirection: 'row', alignItems: 'center', gap: space.s, backgroundColor: color.accentTint, borderRadius: radius.control, paddingLeft: space.m - 4, marginTop: space.s },
  undoBtn: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.s },
});
