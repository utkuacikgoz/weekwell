import {
  RETAILER_LABEL,
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

/** Outcomes, not features: what the week feels like with Weekwell. */
const BENEFITS = [
  ['A new week in two minutes', 'Five dinners and two lunch preps, built around your store, budget and time.'],
  ['Swap anything', 'Three alternatives for any meal. Your grocery list updates itself.'],
  ['One trip, one list', 'Every ingredient by aisle, with what it costs at your store.'],
  ['Cook without scrolling', 'Every step on one screen, with timers built in.'],
] as const;

const DAY = 86_400_000;

/** One plan as a full-width row: name and badge, billed price, per-week equivalent (same unit for every option). */
function PlanRow({ product, selected, onPress, badge }: { product: SubscriptionProduct; selected: boolean; onPress: () => void; badge?: string }) {
  return (
    <Pressable
      testID={`product-${product.id}`}
      accessibilityRole="radio"
      aria-checked={selected}
      accessibilityLabel={`${product.label}. ${formatMoney(product.priceCents)} a ${PERIOD[product.period]}.${product.period === 'week' ? '' : ` About ${perWeek(product)} a week.`}${badge ? ` ${badge}.` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.plan, selected && styles.planOn, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <Icon name="check" size={14} color={color.onAccent} strokeWidth={3} /> : null}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.planHead}>
          <Text variant="bodyStrong">{product.label}</Text>
          {badge ? <Text variant="caption" style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text variant="meta" tone="muted">{product.period === 'week' ? 'Pay as you go' : `About ${perWeek(product)} a week`}</Text>
      </View>
      <Text variant="bodyStrong" style={styles.tabular}>
        {formatMoney(product.priceCents)}
        <Text variant="meta" tone="muted">{` /${PERIOD[product.period]}`}</Text>
      </Text>
    </Pressable>
  );
}

export default function Trial() {
  const { data, entitlementView: view, startTrial, purchase, restorePurchases, refreshEntitlement, manageSubscription, analytics } = useStore();
  const { trigger } = useLocalSearchParams<{ trigger?: string }>();
  // D-040 PW2: one recommended plan (yearly), chosen up front; D-045: every plan is visible without a tap.
  const [selected, setSelected] = useState<ProductId>('yearly');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [manageNote, setManageNote] = useState<string | null>(null);
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
  // A free week that won't renew still needs a plan to keep going.
  const lapsing = view.state === 'trial' && !view.willRenew;
  const showPicker = view.state === 'none' || view.state === 'expired' || lapsing;
  const canStart = known && showPicker && !busy;
  const product = getProduct(selected);
  const [openedAt] = useState(() => Date.now());
  const trialEnds = formatShortDate(new Date(openedAt + 7 * DAY).toISOString());
  const store = data.plan ? RETAILER_LABEL[data.plan.preferences.retailer] : null;

  const start = async () => {
    setBusy(true);
    if (eligible) {
      const r = await startTrial(selected);
      setResult(r === 'ok' || r === 'cancelled' ? null : r === 'trial_already_used' ? 'This Apple ID has already had its free week.' : 'Your free week didn’t start, and you haven’t been charged. Try again.');
    } else {
      const r = await purchase(selected);
      setResult(r === 'ok' || r === 'cancelled' ? null : 'That didn’t go through, and you haven’t been charged. Try again.');
    }
    setBusy(false);
  };

  const manage = async () => {
    const r = await manageSubscription();
    setManageNote(r === 'cancelled' ? 'Cancelled. You keep everything until your free week ends.' : r === 'failed' ? 'Open Settings → your name → Subscriptions → Weekwell to manage or cancel.' : null);
  };

  const restore = async () => {
    setRestoreState('busy');
    setRestoreState(await restorePurchases());
  };

  const price = `${formatMoney(product.priceCents)} a ${PERIOD[product.period]}`;
  const chargeLine = eligible ? `Free for 7 days, then ${price}.` : `${price}, charged today.`;

  const title = view.state === 'expired' ? 'Your free week is over' : view.state === 'trial' ? 'Your free week' : view.state === 'active' ? 'You’re all set' : 'Dinner, handled. Every week.';

  return (
    <Screen
      footer={
        showPicker ? (
          <>
            <Text variant="meta" tone="muted" testID="charge-line" style={{ textAlign: 'center' }}>
              {chargeLine}
            </Text>
            <Button label={eligible ? 'Start free week' : `Subscribe · ${price}`} onPress={start} disabled={!canStart} busy={busy} testID="start-trial" />
            <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>{eligible ? '$0 today · Cancel anytime' : 'Cancel anytime'}</Text>
          </>
        ) : undefined
      }
    >
      <NavBar backLabel="Week" />
      {eligible ? <Text variant="label" style={styles.kicker}>First week free</Text> : null}
      <Text variant="title" accessibilityRole="header">{title}</Text>
      {view.state === 'expired' ? (
        <Text tone="muted" style={{ marginTop: space.s }} testID="trial-ended">
          Your last plan and grocery list are still here. Pick a plan to get next week sorted.
        </Text>
      ) : view.state === 'none' ? (
        <Text tone="muted" style={{ marginTop: space.s }}>
          {store ? `Your ${store} week is planned. Keep every week this easy.` : 'Plan the week once. Shop once. Stop thinking about dinner.'}
        </Text>
      ) : null}

      {view.state === 'trial' ? (
        <View style={styles.countdown} testID="trial-active">
          <Text variant="display" style={styles.onSun}>{`${view.daysLeft} day${view.daysLeft === 1 ? '' : 's'} left`}</Text>
          <Text style={styles.onSun}>
            {view.willRenew
              ? `Everything’s unlocked until ${formatShortDate(view.endsAt)}. Then ${getProduct(view.productId).label}, ${formatMoney(getProduct(view.productId).priceCents)} a ${PERIOD[getProduct(view.productId).period]}.`
              : `Your free week ends ${formatShortDate(view.endsAt)} and won’t renew. Pick a plan below to keep planning.`}
          </Text>
        </View>
      ) : null}
      {view.state === 'active' ? (
        <View style={styles.countdown} testID="plan-active">
          <Text variant="display" style={styles.onSun}>{`${getProduct(view.productId).label} plan`}</Text>
          <Text style={styles.onSun}>{view.willRenew ? `Renews ${formatShortDate(view.periodEndsAt)}.` : `Ends ${formatShortDate(view.periodEndsAt)}.`}</Text>
        </View>
      ) : null}

      {view.state === 'none' || view.state === 'expired' ? (
        <View style={styles.value}>
          {BENEFITS.map(([head, body]) => (
            <View key={head} style={styles.valueRow}>
              <View style={styles.tick}>
                <Icon name="check" size={16} color={color.onAccent} strokeWidth={3} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">{head}</Text>
                <Text variant="meta" tone="muted">{body}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

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
      {result ? <Banner tone="warning" title={result} /> : null}

      {showPicker ? (
        <View style={{ marginTop: space.l, gap: space.s }} accessibilityRole="radiogroup" accessibilityLabel={eligible ? 'After the free week' : 'Choose a plan'}>
          <Text variant="label">{eligible ? `After your free week` : 'Choose a plan'}</Text>
          <PlanRow product={getProduct('yearly')} selected={selected === 'yearly'} onPress={() => setSelected('yearly')} badge={`Save ${savings.percent}%`} />
          <PlanRow product={getProduct('monthly')} selected={selected === 'monthly'} onPress={() => setSelected('monthly')} />
          <PlanRow product={getProduct('weekly')} selected={selected === 'weekly'} onPress={() => setSelected('weekly')} />
        </View>
      ) : null}

      {eligible ? (
        <View style={styles.timeline} testID="trial-timeline">
          <View style={styles.step}>
            <View style={[styles.dot, styles.dotOn]} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Today</Text>
              <Text variant="meta" tone="muted">Everything unlocked. $0.</Text>
            </View>
          </View>
          <View style={styles.step}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{trialEnds}</Text>
              <Text variant="meta" tone="muted">{`Your ${product.label.toLowerCase()} plan starts at ${price}. Cancel before then and you pay nothing.`}</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.cancel} testID="cancel-info">
        <Text variant="bodyStrong">Cancel anytime, in two taps</Text>
        <Text variant="meta" tone="muted">Settings → your name → Subscriptions → Weekwell. No emails, no calls, no questions.</Text>
        {view.state === 'trial' || view.state === 'active' ? (
          <Button kind="secondary" label="Manage or cancel" onPress={() => void manage()} testID="manage-subscription" />
        ) : null}
        {manageNote ? <Text variant="meta" accessibilityLiveRegion="polite" testID="manage-note">{manageNote}</Text> : null}
      </View>

      <Text variant="caption" tone="muted" style={{ marginTop: space.l }} testID="legal">
        {`${eligible ? 'Payment is charged to your Apple ID when the free week ends.' : 'Payment is charged to your Apple ID when you confirm.'} Subscriptions renew automatically unless cancelled at least 24 hours before the end of the period. “Save ${savings.percent}%” compares yearly with 12 months of monthly (${formatMoney(savings.monthlyYearCents)}), ${formatMoney(savings.savedCents)} less.`}
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
      {restoreState === 'restored' ? <Text tone="accent" accessibilityLiveRegion="polite">Welcome back. Your subscription is restored.</Text> : null}
      {restoreState === 'nothing_to_restore' ? <Text accessibilityLiveRegion="polite" testID="restore-nothing">No subscription found for this Apple ID.</Text> : null}
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

/** Sun yellow with deep-green text: the brand's attention colour (palette.ts). */
const SUN = '#F6C453';
const ON_SUN = '#173F2D';

const styles = StyleSheet.create({
  kicker: { color: SUN, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: space.xs },
  value: { marginTop: space.l, gap: space.m },
  valueRow: { flexDirection: 'row', gap: space.m - 4, alignItems: 'flex-start' },
  tick: { width: 26, height: 26, borderRadius: 13, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  countdown: { marginTop: space.m, backgroundColor: SUN, padding: space.m + 4, gap: space.xs },
  onSun: { color: ON_SUN },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.m - 4, minHeight: MIN_TOUCH + 20, borderRadius: radius.card, borderWidth: 1.5, borderColor: color.divider, backgroundColor: color.raised, paddingHorizontal: space.m - 4, paddingVertical: space.s + 4 },
  planOn: { borderColor: color.accent, borderWidth: 2, backgroundColor: color.accentTint },
  planHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.s },
  badge: { backgroundColor: SUN, color: ON_SUN, paddingHorizontal: 6, paddingVertical: 2, textTransform: 'uppercase', letterSpacing: 0.6, overflow: 'hidden' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.control, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: color.accent, borderColor: color.accent },
  timeline: { marginTop: space.l, gap: space.m, borderLeftWidth: 2, borderLeftColor: color.divider, marginLeft: 6, paddingLeft: space.m },
  step: { flexDirection: 'row', gap: space.s },
  dot: { position: 'absolute', left: -space.m - 7, top: 4, width: 12, height: 12, borderRadius: 6, backgroundColor: color.divider },
  dotOn: { backgroundColor: color.accent },
  cancel: { marginTop: space.l, gap: space.xs, backgroundColor: color.raised, padding: space.m },
  tabular: { fontVariant: ['tabular-nums'] },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: MIN_TOUCH },
  restore: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: MIN_TOUCH, alignSelf: 'flex-start', marginTop: space.xs, paddingHorizontal: space.s, marginHorizontal: -space.s, borderRadius: radius.control },
});
