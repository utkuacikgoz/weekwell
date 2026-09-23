import {
  RETAILER_LABEL,
  formatMoney,
  formatRelativeTime,
  formatShortDate,
  generateUnderBudgetPlan,
  type Plan,
} from '@weekwell/domain';
import { useMemo } from 'react';
import { View } from 'react-native';
import type { StoredPrices } from '../state/store';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Text } from './Text';

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="label">{title}</Text>
      <Text tone="muted">{children}</Text>
    </View>
  );
}

/** Full explanation of the total; the main screen only carries one concise line. */
export function AboutEstimateSheet({ visible, onClose, prices, plan, staples, onRefresh }: { visible: boolean; onClose: () => void; prices?: StoredPrices; plan: Plan; staples: string[]; onRefresh: () => void }) {
  const store = RETAILER_LABEL[plan.preferences.retailer];
  const budget = plan.preferences.weeklyBudget;
  const now = new Date();
  const t = prices?.total;
  const source = !t || t.status !== 'available'
    ? `We couldn’t get a complete set of prices from ${store}, so we don’t show a total. Items that do have a price still show it in the grocery list.`
    : t.isSample
      ? `These are sample prices written on ${formatShortDate(t.oldestObservedAt)} for testing. They weren’t checked in a store.`
      : t.kind === 'verified'
        ? `Verified store prices, checked ${formatRelativeTime(t.oldestObservedAt, now)}.`
        : `Estimates from our price source, checked ${formatRelativeTime(t.oldestObservedAt, now)}.`;
  const diff = t?.status === 'available' ? t.totalCents - budget * 100 : null;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="About this estimate"
      testID="about-sheet"
      footer={
        <>
          <Button label="Done" onPress={onClose} testID="about-done" />
          <Button label="Check prices again" kind="secondary" onPress={onRefresh} />
        </>
      }
    >
      <Text variant="title">{t?.status === 'available' ? `${formatMoney(t.totalCents, { whole: true })}` : 'No total'}</Text>
      <Section title="How it’s worked out">
        {`We add up whole packages for the ${t?.itemCount ?? ''} items on your list at ${store}. You buy full packages, so some leftovers are included.`}
      </Section>
      <Section title="Where prices come from">{source}</Section>
      <Section title="Your budget">
        {diff === null ? `$${budget} a week. We’ll compare once prices are available.` : diff > 0 ? `$${budget} a week. This week is about ${formatMoney(diff, { whole: true })} over.` : `$${budget} a week. This week is about ${formatMoney(-diff, { whole: true })} under.`}
      </Section>
      {staples.length ? <Section title="Not included">{`${staples.join(', ')}. We assume you have these at home.`}</Section> : null}
      <Text variant="meta" tone="muted">Prices can change in store.</Text>
    </Sheet>
  );
}

/** Preview before replacing meals: what changes, and whether the cheapest week still fits. */
export function RebuildSheet({ visible, onClose, plan, onApply }: { visible: boolean; onClose: () => void; plan: Plan; onApply: (next: Plan, changed: number) => void }) {
  const preview = useMemo(() => {
    if (!visible) return null;
    const res = generateUnderBudgetPlan(plan.preferences, { ownerId: plan.ownerId, planId: plan.id, now: new Date() });
    if (!res.ok) return null;
    const before = [...plan.dinners, ...plan.lunches];
    const after = [...res.plan.dinners, ...res.plan.lunches];
    const changed = after.filter((m, i) => before[i]?.recipeId !== m.recipeId).length;
    return { plan: res.plan, changed, cents: res.estimatedCents ?? 0 };
  }, [visible, plan]);
  const budget = plan.preferences.weeklyBudget;
  const stillOver = preview ? preview.cents - budget * 100 : 0;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Rebuild under budget"
      testID="rebuild-sheet"
      footer={
        <>
          <Button label={preview?.changed ? `Rebuild week · ${preview.changed} meals change` : 'Nothing cheaper to change'} disabled={!preview?.changed} onPress={() => preview && onApply(preview.plan, preview.changed)} testID="rebuild-apply" />
          <Button label="Keep this week" kind="secondary" onPress={onClose} />
        </>
      }
    >
      <Text>We’ll pick the lowest-cost meals that still fit your cooking time and the foods you leave out.</Text>
      {preview ? (
        <Text variant="bodyStrong">{`About ${formatMoney(preview.cents, { whole: true })} estimated`}</Text>
      ) : null}
      {preview && stillOver > 0 ? (
        <Text tone="warning">{`Even the lowest-cost week is about ${formatMoney(stillOver, { whole: true })} over your $${budget} budget. You could raise your budget or plan for fewer people.`}</Text>
      ) : null}
      <Text variant="meta" tone="muted">You can undo this right after.</Text>
    </Sheet>
  );
}
