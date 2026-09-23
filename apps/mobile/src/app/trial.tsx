import {
  SUBSCRIPTION_PRODUCTS,
  formatMoney,
  formatShortDate,
  getProduct,
  yearlySavingsVsMonthly,
  type ProductId,
  type SubscriptionProduct,
} from '@weekwell/domain';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Layout';
import { NavBar } from '../components/NavBar';
import { ChoiceGroup } from '../components/Segmented';
import { Text } from '../components/Text';
import { useStore } from '../state/store';
import { MIN_TOUCH, color, radius, space } from '../theme/tokens';

const PERIOD: Record<SubscriptionProduct['period'], string> = { week: 'week', month: 'month', year: 'year' };
const WEEKS: Record<SubscriptionProduct['period'], number> = { week: 1, month: 52 / 12, year: 52 };

/** Same unit for every option: the billed price, plus the per-week equivalent (plain arithmetic). */
function perWeek(p: SubscriptionProduct): string {
  return formatMoney(Math.round(p.priceCents / WEEKS[p.period]));
}

const VALUE = [
  ['A new week of dinners and lunches', 'Planned around your store, budget, and time'],
  ['Swaps whenever a meal doesn’t fit', 'Only that meal changes, and you can undo'],
  ['One grocery list', 'Grouped by aisle, with estimated prices'],
] as const;

export default function Trial() {
  const { entitlementView: view, startTrial, purchase, restorePurchases, refreshEntitlement, analytics } = useStore();
  const { trigger } = useLocalSearchParams<{ trigger?: string }>();
  const [selected, setSelected] = useState<ProductId | null>(null); // never preselected
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [restoreState, setRestoreState] = useState<'idle' | 'busy' | 'restored' | 'nothing_to_restore' | 'failed'>('idle');
  const savings = yearlySavingsVsMonthly();

  useEffect(() => {
    const t = trigger === 'grocery_list' || trigger === 'settings' || trigger === 'meal_detail' ? trigger : 'plan_header';
    analytics?.track('paywall_viewed', { trigger: t });
    analytics?.track('trial_viewed', { trigger: t });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const known = view.state !== 'loading' && view.state !== 'error';
  const eligible = view.state === 'none' && view.trialEligible;
  const canStart = known && (view.state === 'none' || view.state === 'expired') && selected !== null && !busy;
  const product = selected ? getProduct(selected) : null;

  const start = async () => {
    if (!selected) return;
    setBusy(true);
    if (eligible) {
      const r = await startTrial(selected);
      setResult(r === 'ok' ? null : r === 'trial_already_used' ? 'This account has already used its free week.' : 'We couldn’t start your free week. You haven’t been charged. Try again.');
    } else {
      const r = await purchase(selected);
      setResult(r === 'ok' ? null : 'We couldn’t complete the purchase. You haven’t been charged. Try again.');
    }
    setBusy(false);
  };

  const restore = async () => {
    setRestoreState('busy');
    setRestoreState(await restorePurchases());
  };

  const showPicker = view.state === 'none' || view.state === 'expired';

  return (
    <Screen
      footer={
        showPicker ? (
          <>
            <Text variant="meta" tone="muted" testID="charge-line">
              {product
                ? eligible
                  ? `Free for 7 days, then ${formatMoney(product.priceCents)} a ${PERIOD[product.period]}. You’re charged when the free week ends unless you cancel.`
                  : `${formatMoney(product.priceCents)} a ${PERIOD[product.period]}, charged today. Cancel any time.`
                : 'Choose a plan to see exactly what you’d pay and when.'}
            </Text>
            <Button label={eligible ? 'Start free week' : 'Subscribe'} onPress={start} disabled={!canStart} busy={busy} testID="start-trial" />
          </>
        ) : undefined
      }
    >
      <NavBar backLabel="Week" />
      <Text variant="title" accessibilityRole="header">
        {view.state === 'expired' ? 'Keep planning your weeks' : 'Try Weekwell free for a week'}
      </Text>

      <View style={styles.value}>
        {VALUE.map(([title, detail]) => (
          <View key={title} style={styles.valueRow} accessible accessibilityLabel={`${title}. ${detail}`}>
            <View style={styles.tick}>
              <Icon name="check" size={16} color={color.accent} strokeWidth={2.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{title}</Text>
              <Text variant="meta" tone="muted">{detail}</Text>
            </View>
          </View>
        ))}
      </View>

      {view.state === 'loading' ? (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <ActivityIndicator color={color.ink} />
          <Text tone="muted">Checking your subscription…</Text>
        </View>
      ) : null}
      {view.state === 'error' ? (
        <Banner tone="warning" title="We couldn’t check your subscription">
          <Text>Purchases are paused until we can. Your plan still works.</Text>
          <Button label="Try again" kind="secondary" onPress={() => void refreshEntitlement()} />
        </Banner>
      ) : null}
      {view.state === 'trial' ? (
        <Banner tone="info" title={`You’re on your free week · ${view.daysLeft} day${view.daysLeft === 1 ? '' : 's'} left`} testID="trial-active">
          <Text>
            Ends {formatShortDate(view.endsAt)}.{' '}
            {view.willRenew ? `Then ${formatMoney(getProduct(view.productId).priceCents)} a ${PERIOD[getProduct(view.productId).period]} unless you cancel.` : 'It won’t renew.'}
          </Text>
        </Banner>
      ) : null}
      {view.state === 'active' ? (
        <Banner tone="info" title={`${getProduct(view.productId).label} plan`} testID="plan-active">
          <Text>{view.willRenew ? `Renews ${formatShortDate(view.periodEndsAt)}.` : `Ends ${formatShortDate(view.periodEndsAt)}.`}</Text>
        </Banner>
      ) : null}
      {view.state === 'expired' ? (
        <Text tone="muted" style={{ marginTop: space.m }} testID="trial-ended">
          Your free week has ended. Your last plan and grocery list are still available.
        </Text>
      ) : null}
      {result ? <Banner tone="warning" title={result} /> : null}

      {showPicker ? (
        <View style={{ marginTop: space.l }}>
          <ChoiceGroup
            label={eligible ? 'After the free week' : 'Choose a plan'}
            columns={1}
            value={selected ?? ('' as ProductId)}
            onChange={setSelected}
            options={SUBSCRIPTION_PRODUCTS.map((p) => ({
              value: p.id,
              testID: `product-${p.id}`,
              label: `${p.label} · ${formatMoney(p.priceCents)} a ${PERIOD[p.period]}`,
              detail:
                p.id === 'yearly'
                  ? `About ${perWeek(p)} a week, billed yearly. ${formatMoney(savings.savedCents)} less than 12 months of monthly (${formatMoney(savings.monthlyYearCents)}).`
                  : p.id === 'monthly'
                    ? `About ${perWeek(p)} a week, billed monthly.`
                    : 'Billed every week.',
            }))}
          />
        </View>
      ) : null}

      <Text variant="heading" accessibilityRole="header" style={styles.section}>Cancelling</Text>
      <Text tone="muted">
        Cancel any time in your App Store subscription settings. Cancel at least 24 hours before the free week ends and you won’t be charged. No hidden fees.
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={restore}
        disabled={!known || restoreState === 'busy'}
        aria-disabled={!known || restoreState === 'busy'}
        style={({ pressed }) => [styles.restore, pressed && { backgroundColor: color.placeholder }]}
        testID="restore"
      >
        {restoreState === 'busy' ? <ActivityIndicator color={color.accent} /> : <Icon name="refresh" size={18} color={color.accent} />}
        <Text variant="bodyStrong" tone="accent">Restore purchases</Text>
      </Pressable>
      {restoreState === 'restored' ? <Text tone="accent" accessibilityLiveRegion="polite">Your subscription is restored.</Text> : null}
      {restoreState === 'nothing_to_restore' ? <Text accessibilityLiveRegion="polite" testID="restore-nothing">We didn’t find a subscription for this Apple ID.</Text> : null}
      {restoreState === 'failed' ? (
        <Banner tone="warning" title="We couldn’t reach the App Store" testID="restore-failed">
          <Text>Nothing changed. Check your connection and try again.</Text>
        </Banner>
      ) : null}

      <Text variant="caption" tone="muted" style={{ marginTop: space.l }}>
        Test build: starting a free week here doesn’t charge you or create an App Store subscription.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  value: { marginTop: space.l, gap: space.m },
  valueRow: { flexDirection: 'row', gap: space.m - 4, alignItems: 'flex-start' },
  tick: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.accentTint, alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: MIN_TOUCH },
  section: { marginTop: space.l, marginBottom: space.xs },
  restore: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: MIN_TOUCH, alignSelf: 'flex-start', marginTop: space.m, paddingHorizontal: space.s, marginHorizontal: -space.s, borderRadius: radius.control },
});
