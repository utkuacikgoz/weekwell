import { DAY_LABEL, RETAILER_LABEL, formatMoney, getProduct, mealCostShares, swapOptions, type Day, type EntitlementView, type Meal } from '@weekwell/domain';
import { Redirect, router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { FooterAction, Screen } from '../components/Layout';
import { LockedSheet } from '../components/LockedSheet';
import { AboutEstimateSheet, RebuildSheet } from '../components/PriceSheets';
import { PriceChip, PriceNotice } from '../components/PriceStatus';
import { Text } from '../components/Text';
import { TonightCard, WeekRow } from '../components/WeekParts';
import { Wordmark } from '../components/Wordmark';
import { GOAL_COPY, householdCopy, timeCopy } from '../copy';
import { canChangePlan } from '../services/access';
import { resumable } from '../services/cooking';
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
  const { data, priceCheck, groceryItems, entitlementView, scenarios, refreshPrices, applyPlan, planUndo, undoPlanChange, dismissPlanUndo, setDraft, setCooking } = useStore();
  const { width, height, fontScale } = useWindowDimensions();
  // Short screens or large text: a shorter hero image so tonight's dish name stays in view.
  const compact = height < 700 || fontScale * scenarios.fontScale > 1.2;
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
  const onPriceAction = (a: 'about' | 'refresh' | 'rebuild') => {
    if (a === 'refresh') void refreshPrices();
    else if (a === 'rebuild' && !canChangePlan(entitlementView)) {
      setLockedAction('rebuild your week');
      setSheet('locked');
    } else setSheet(a);
  };
  const cardWidth = Math.min(width, 560) - 2 * (space.m + 4);

  // D-040 PR5: each meal's share of the displayed estimate, and cheaper-swap links when over budget.
  const listMeals = [...plan.dinners, ...plan.lunches].filter((m) => !data.skippedMealIds.includes(m.id));
  const total = prices && prices.retailer === p.retailer && prices.total.status === 'available' ? prices.total : null;
  const shares = total && prices ? mealCostShares(listMeals, groceryItems, new Map(prices.items)) : null;
  const overCents = total ? total.totalCents - p.weeklyBudget * 100 : 0;
  const swapLinks = new Map<string, { label: string; onPress: () => void }>();
  if (shares && overCents > 0) {
    let covered = 0;
    const byCost = plan.dinners.filter((d) => shares.has(d.id)).sort((a, b) => (shares.get(b.id) ?? 0) - (shares.get(a.id) ?? 0));
    for (const d of byCost) {
      if (covered >= overCents || swapLinks.size >= 2) break;
      const best = swapOptions(plan, d.id, 1, 'cheaper')[0];
      const saving = best ? -best.costDeltaCents : 0;
      if (saving < 100) continue;
      covered += saving;
      swapLinks.set(d.id, {
        // Savings come from sample package prices, so the number shows only when the total does too.
        label: total?.isSample ? `Swap, save about ${formatMoney(saving, { whole: true })}` : 'Swap for a cheaper dinner',
        onPress: () => {
          if (!canChangePlan(entitlementView)) {
            setLockedAction('swap meals');
            setSheet('locked');
          } else router.push(`/meal/${d.id}?swap=cheaper` as Href);
        },
      });
    }
  }
  const costOf = (m: Meal) => (shares?.has(m.id) ? formatMoney(shares.get(m.id)!, { whole: true }) : undefined);

  return (
    <Screen
      testID="week-screen"
      footerRow
      footer={
        <>
          <PriceChip priceCheck={priceCheck} budget={p.weeklyBudget} onAbout={() => setSheet('about')} />
          <FooterAction>
            <Button
              label={checkedCount > 0 ? `Grocery list · ${checkedCount} of ${groceryItems.length}` : 'Open grocery list'}
              onPress={() => router.push('/grocery')}
              testID="open-grocery"
            />
          </FooterAction>
        </>
      }
    >
      <Wordmark />
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

      <PriceNotice
        priceCheck={priceCheck}
        budget={p.weeklyBudget}
        onAction={onPriceAction}
        secondary={{ label: 'Change setup', onPress: () => router.push('/preferences') }}
        skip={shares ? ['over_budget'] : undefined}
      />

      {(() => {
        const all = [...plan.dinners, ...plan.lunches];
        if (!resumable(data.cooking, all.map((m) => m.id))) return null;
        const c = data.cooking;
        const m = all.find((x) => x.id === c.mealId)!;
        return (
          <View style={styles.resume} testID="continue-cooking">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Continue cooking ${m.name}, step ${c.step + 1} of ${m.steps.length}`}
              onPress={() => router.push(`/cook/${m.id}` as Href)}
              style={({ pressed }) => [styles.resumeMain, pressed && { opacity: 0.8 }]}
              testID="continue-cooking-open"
            >
              <Icon name="timer" size={20} color={color.accent} />
              <View style={{ flex: 1 }}>
                <Text variant="label" tone="accent">Continue cooking · step {c.step + 1} of {m.steps.length}</Text>
                <Text variant="meta" numberOfLines={1}>{m.name}</Text>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Stop cooking" onPress={() => setCooking(null)} style={styles.undoBtn} testID="continue-cooking-dismiss">
              <Icon name="close" size={18} color={color.inkMuted} />
            </Pressable>
          </View>
        );
      })()}

      <View style={{ height: space.m }} />
      {tonight ? <TonightCard meal={tonight} label={tonightLabel} width={cardWidth} compact={compact} onPress={() => open(tonight.id)} /> : null}

      <Text variant="heading" accessibilityRole="header" style={styles.section}>
        This week
      </Text>
      {total && shares ? (
        <View style={styles.budgetLine} testID="budget-line" accessibilityLiveRegion="polite">
          <Text variant="meta" style={{ flexShrink: 1 }}>
            <Text variant="label">{formatMoney(total.totalCents, { whole: true })} this week</Text>
            {overCents > 0 ? (
              <Text variant="label" tone="warning">{` · ${overCents < 100 ? 'less than $1' : formatMoney(overCents, { whole: true })} over`}</Text>
            ) : (
              <Text variant="meta" tone="muted">{` · ${formatMoney(-overCents, { whole: true })} under`}</Text>
            )}
            <Text variant="meta" tone="muted">{` your $${p.weeklyBudget}`}</Text>
          </Text>
          {overCents > 0 ? <Button kind="quiet" label={`Rebuild under $${p.weeklyBudget}`} onPress={() => onPriceAction('rebuild')} testID="price-action-rebuild" /> : null}
        </View>
      ) : null}
      {plan.dinners.map((d, i) => (
        <WeekRow key={d.id} band={i} meal={d} tonight={d.day === tonightDay} offList={data.skippedMealIds.includes(d.id)} onPress={() => open(d.id)} cost={costOf(d)} swap={swapLinks.get(d.id)} />
      ))}

      <Text variant="heading" accessibilityRole="header" style={styles.section}>
        Work lunches
      </Text>
      {plan.lunches.map((l, i) => (
        <WeekRow key={l.id} band={plan.dinners.length + i} meal={l} offList={data.skippedMealIds.includes(l.id)} onPress={() => open(l.id)} cost={costOf(l)} />
      ))}

      <Text variant="meta" tone="muted" style={{ marginTop: space.l, marginBottom: space.l }}>
        {shares ? 'A meal’s cost is its share of the estimated total. ' : ''}Protein is an estimate · check package labels for exact values
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
          kind="quiet"
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
          void applyPlan({ kind: 'rebuild', localPlan: next }, `Week rebuilt under budget · ${changed} meal${changed === 1 ? '' : 's'} changed`);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  context: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: MIN_TOUCH + 4, marginTop: space.xs, paddingHorizontal: space.s, marginHorizontal: -space.s, borderRadius: radius.control },
  section: { marginTop: space.l + 4, marginBottom: space.xs },
  resume: { flexDirection: 'row', alignItems: 'center', backgroundColor: color.accentTint, borderRadius: radius.control, marginTop: space.m },
  resumeMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: MIN_TOUCH + 8, paddingLeft: space.m - 4 },
  budgetLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: space.s, marginBottom: space.xs },
  sub: { marginTop: space.l, flexDirection: 'row', alignItems: 'center', gap: space.m },
  undo: { flexDirection: 'row', alignItems: 'center', gap: space.s, backgroundColor: color.accentTint, borderRadius: radius.control, paddingLeft: space.m - 4, marginTop: space.s },
  undoBtn: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.s },
});
