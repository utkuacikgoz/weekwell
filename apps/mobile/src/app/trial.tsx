import {
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
import { LegalLinks } from '../components/LegalLinks';
import { Screen } from '../components/Layout';
import { NavBar } from '../components/NavBar';
import { Text } from '../components/Text';
import { revenueCatEnabled } from '../services/purchases';
import { useStore } from '../state/store';
import { MIN_TOUCH, color, radius, space } from '../theme/tokens';

const PERIOD: Record<SubscriptionProduct['period'], string> = { week: 'week', month: 'month', year: 'year' };
const WEEKS: Record<SubscriptionProduct['period'], number> = { week: 1, month: 52 / 12, year: 52 };

/** Same unit for every option: the billed price, plus the per-week equivalent (plain arithmetic). */
function perWeek(p: SubscriptionProduct): string {
  return formatMoney(Math.round(p.priceCents / WEEKS[p.period]));
}

const BENEFITS = ['A new week planned for your store and budget', 'Swap any meal, with undo', 'One grocery list, grouped by aisle'] as const;

/** One plan as a card: name, billed price, and the per-week equivalent in the same unit for every option. */
function PlanCard({ product, selected, onPress, badge }: { product: SubscriptionProduct; selected: boolean; onPress: () => void; badge?: string }) {
  return (
    <Pressable
      testID={`product-${product.id}`}
      accessibilityRole="radio"
      aria-checked={selected}
      accessibilityLabel={`${product.label}. ${formatMoney(product.priceCents)} a ${PERIOD[product.period]}. About ${perWeek(product)} a week.${badge ? ` ${badge}.` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.plan, selected && styles.planOn, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.planHead}>
        <Text variant="bodyStrong" tone={selected ? 'accent' : 'ink'}>{product.label}</Text>
        <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <Icon name="check" size={14} color={color.onAccent} strokeWidth={3} /> : null}</View>
      </View>
      <Text variant="heading" style={styles.tabular}>{formatMoney(product.priceCents)}<Text variant="meta" tone="muted">{` a ${PERIOD[product.period]}`}</Text></Text>
      <Text variant="meta" tone="muted">About {perWeek(product)} a week</Text>
      {badge ? <Text variant="caption" tone="accent" style={styles.badge}>{badge}</Text> : null}
    </Pressable>
  );
}

export default function Trial() {
  const { entitlementView: view, startTrial, purchase, restorePurchases, refreshEntitlement, analytics } = useStore();
  const { trigger } = useLocalSearchParams<{ trigger?: string }>();
  // D-040 PW2: one recommended plan (yearly), chosen up front; the others are one tap away.
  // This replaces D-037's "nothing preselected"; the charge line always states the exact price.
  const [selected, setSelected] = useState<ProductId | null>('yearly');
  const [showAll, setShowAll] = useState(false);
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
      setResult(r === 'ok' || r === 'cancelled' ? null : r === 'trial_already_used' ? 'This account has already used its free week.' : 'We couldn’t start your free week. You haven’t been charged. Try again.');
    } else {
      const r = await purchase(selected);
      setResult(r === 'ok' || r === 'cancelled' ? null : 'We couldn’t complete the purchase. You haven’t been charged. Try again.');
    }
    setBusy(false);
  };

  const restore = async () => {
    setRestoreState('busy');
    setRestoreState(await restorePurchases());
  };

  const showPicker = view.state === 'none' || view.state === 'expired';

  const chargeLine = product
    ? eligible
      ? `Free for 7 days, then ${formatMoney(product.priceCents)} a ${PERIOD[product.period]}.`
      : `${formatMoney(product.priceCents)} a ${PERIOD[product.period]}, charged today.`
    : eligible
      ? 'Free for 7 days. Nothing is charged today.'
      : 'Pick a plan to continue.';

  return (
    <Screen
      footer={
        showPicker ? (
          <>
            <Text variant="meta" tone="muted" testID="charge-line" style={{ textAlign: 'center' }}>
              {chargeLine}
            </Text>
            <Button label={!selected ? 'Choose a plan' : eligible ? 'Start free week' : 'Subscribe'} onPress={start} disabled={!canStart} busy={busy} testID="start-trial" />
          </>
        ) : undefined
      }
    >
      <NavBar backLabel="Week" />
      <Text variant="title" accessibilityRole="header">
        {view.state === 'expired' ? 'Keep planning your weeks' : 'Your first week is free'}
      </Text>
      {view.state === 'expired' ? (
        <Text tone="muted" style={{ marginTop: space.xs }} testID="trial-ended">
          Your free week has ended. Your last plan and grocery list are still here.
        </Text>
      ) : null}

      <View style={styles.value}>
        {BENEFITS.map((b) => (
          <View key={b} style={styles.valueRow}>
            <Icon name="check" size={20} color={color.accent} strokeWidth={2.4} />
            <Text style={{ flex: 1 }}>{b}</Text>
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
      {result ? <Banner tone="warning" title={result} /> : null}

      {showPicker ? (
        <View style={{ marginTop: space.l }} accessibilityRole="radiogroup" accessibilityLabel={eligible ? 'After the free week' : 'Choose a plan'}>
          <Text variant="label" style={{ marginBottom: space.s }}>{eligible ? 'After the free week' : 'Choose a plan'}</Text>
          <View style={styles.plans}>
            <PlanCard product={getProduct('yearly')} selected={selected === 'yearly'} onPress={() => setSelected('yearly')} badge={`Best value · save ${savings.percent}% vs monthly`} />
            {showAll ? <PlanCard product={getProduct('monthly')} selected={selected === 'monthly'} onPress={() => setSelected('monthly')} /> : null}
          </View>
          {showAll ? (
            <Pressable
              testID="product-weekly"
              accessibilityRole="radio"
              aria-checked={selected === 'weekly'}
              accessibilityLabel={`Weekly. ${formatMoney(getProduct('weekly').priceCents)} a week`}
              onPress={() => setSelected('weekly')}
              style={({ pressed }) => [styles.weekly, pressed && { backgroundColor: color.placeholder }]}
            >
              <View style={[styles.radio, selected === 'weekly' && styles.radioOn]}>{selected === 'weekly' ? <Icon name="check" size={14} color={color.onAccent} strokeWidth={3} /> : null}</View>
              <Text variant="meta">Or pay weekly · {formatMoney(getProduct('weekly').priceCents)} a week</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setShowAll(true)} style={({ pressed }) => [styles.weekly, styles.others, pressed && { backgroundColor: color.placeholder }]} testID="see-other-plans">
              <Text variant="bodyStrong" tone="accent" style={{ textDecorationLine: 'underline' }}>
                See other plans
              </Text>
              <Text variant="meta" tone="muted">
                Monthly {formatMoney(getProduct('monthly').priceCents)} · weekly {formatMoney(getProduct('weekly').priceCents)}
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}

      <Text variant="caption" tone="muted" style={{ marginTop: space.l }} testID="legal">
        {`${eligible ? 'Payment is charged to your Apple ID when the free week ends.' : 'Payment is charged to your Apple ID when you confirm.'} Subscriptions renew automatically unless cancelled at least 24 hours before the end of the period. Manage or cancel in your App Store account settings. The yearly saving compares with 12 months of monthly (${formatMoney(savings.monthlyYearCents)}), ${formatMoney(savings.savedCents)} less.`}
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={restore}
        disabled={!known || restoreState === 'busy'}
        aria-disabled={!known || restoreState === 'busy'}
        style={({ pressed }) => [styles.restore, pressed && { backgroundColor: color.placeholder }]}
        testID="restore"
      >
        {restoreState === 'busy' ? <ActivityIndicator color={color.accent} /> : null}
        <Text variant="meta" tone="accent" style={{ textDecorationLine: 'underline' }}>Restore purchases</Text>
      </Pressable>
      <LegalLinks pages={[{ page: 'terms', label: 'Terms of use' }, { page: 'privacy', label: 'Privacy policy' }]} testID="paywall-legal-links" />
      {restoreState === 'restored' ? <Text tone="accent" accessibilityLiveRegion="polite">Your subscription is restored.</Text> : null}
      {restoreState === 'nothing_to_restore' ? <Text accessibilityLiveRegion="polite" testID="restore-nothing">We didn’t find a subscription for this Apple ID.</Text> : null}
      {restoreState === 'failed' ? (
        <Banner tone="warning" title="We couldn’t reach the App Store" testID="restore-failed">
          <Text>Nothing changed. Check your connection and try again.</Text>
        </Banner>
      ) : null}

      {!revenueCatEnabled ? (
        <Text variant="caption" tone="muted" style={{ marginTop: space.m }}>
          Test build: starting a free week here doesn’t charge you or create an App Store subscription.
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  value: { marginTop: space.l, gap: space.s + 4 },
  valueRow: { flexDirection: 'row', gap: space.m - 4, alignItems: 'flex-start' },
  plans: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  plan: { flexGrow: 1, flexBasis: 140, gap: 2, borderRadius: radius.card, borderWidth: 1.5, borderColor: color.divider, backgroundColor: color.raised, padding: space.m - 4 },
  planOn: { borderColor: color.accent, borderWidth: 2, backgroundColor: color.accentTint },
  planHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.xs },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.control, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: color.accent, borderColor: color.accent },
  badge: { marginTop: space.xs },
  weekly: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: MIN_TOUCH, marginTop: space.s, paddingHorizontal: space.s, marginHorizontal: -space.s, borderRadius: radius.control, alignSelf: 'flex-start' },
  others: { flexWrap: 'wrap', columnGap: space.s, rowGap: 0, alignSelf: 'stretch' },
  tabular: { fontVariant: ['tabular-nums'] },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: MIN_TOUCH },
  restore: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: MIN_TOUCH, alignSelf: 'flex-start', marginTop: space.xs, paddingHorizontal: space.s, marginHorizontal: -space.s, borderRadius: radius.control },
});
