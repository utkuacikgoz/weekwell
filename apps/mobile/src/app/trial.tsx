import {
  DAY_LABEL,
  formatMoney,
  formatShortDate,
  getProduct,
  yearlySavingsVsMonthly,
  type Meal,
  type ProductId,
  type SubscriptionProduct,
} from '@weekwell/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { LegalLinks } from '../components/LegalLinks';
import { Screen } from '../components/Layout';
import { MealImage } from '../components/MealImage';
import { NavBar } from '../components/NavBar';
import { RcPaywall } from '../components/RcPaywall';
import { Text } from '../components/Text';
import { BANDS } from '../components/WeekParts';
import { revenueCatEnabled } from '../services/purchases';
import { useStore } from '../state/store';
import { MIN_TOUCH, color, radius, space } from '../theme/tokens';

const PERIOD: Record<SubscriptionProduct['period'], string> = { week: 'week', month: 'month', year: 'year' };
const WEEKS: Record<SubscriptionProduct['period'], number> = { week: 1, month: 52 / 12, year: 52 };

/** Same unit for every option: the billed price, plus the per-week equivalent (plain arithmetic). */
function perWeek(p: SubscriptionProduct): string {
  return formatMoney(Math.round(p.priceCents / WEEKS[p.period]));
}

/** One plan per row (D-049 PV1): name, badge, billed price. The per-week figure stays in the spoken label. */
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
      <View style={styles.planHead}>
        <Text variant="bodyStrong">{product.label}</Text>
        {badge ? <Text variant="caption" style={styles.badge}>{badge}</Text> : null}
      </View>
      <Text variant="bodyStrong" style={styles.tabular}>
        {formatMoney(product.priceCents)}
        <Text variant="meta" tone="muted">{` /${PERIOD[product.period]}`}</Text>
      </Text>
    </Pressable>
  );
}

/** The pitch is the person's own week (D-049 PV1): their dinners as colour bands, read-only. The badge rides on Monday's line. */
function WeekHero({ dinners, badge, badgeTestID }: { dinners: Meal[]; badge: string | null; badgeTestID?: string }) {
  return (
    <View style={styles.hero} accessible accessibilityLabel={`Your week: ${dinners.map((d) => `${DAY_LABEL[d.day]}, ${d.name}`).join('. ')}.`} testID="paywall-week">
      {dinners.map((d, i) => (
        <View key={d.id} style={[styles.heroRow, { backgroundColor: BANDS[i % BANDS.length] }]}>
          <MealImage recipeId={d.recipeId} ingredientIds={d.ingredients.map((x) => x.ingredientId)} width={44} radius={radius.thumb} />
          <View style={{ flex: 1 }}>
            <View style={styles.heroCaption}>
              <Text variant="caption" style={styles.onBandSoft}>{DAY_LABEL[d.day]}</Text>
              {i === 0 && badge ? <Text variant="label" style={styles.badge} testID={badgeTestID}>{badge}</Text> : null}
            </View>
            <Text variant="bodyStrong" style={styles.onBand} numberOfLines={1}>{d.name}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function Trial() {
  const { data, entitlementView: view, startTrial, purchase, restorePurchases, refreshEntitlement, manageSubscription, paywallCompleted, analytics } = useStore();
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

  const dinners = data.plan?.dinners ?? [];
  const current = view.state === 'trial' || view.state === 'active' ? getProduct(view.productId) : null;
  const trialLine =
    view.state === 'trial' && current
      ? view.willRenew
        ? `Then ${current.label}, ${formatMoney(current.priceCents)} a ${PERIOD[current.period]}, from ${formatShortDate(view.endsAt)}.`
        : `Ends ${formatShortDate(view.endsAt)}. Won’t renew.`
      : null;
  const badge =
    view.state === 'trial'
      ? { text: `${view.daysLeft} day${view.daysLeft === 1 ? '' : 's'} left`, id: 'trial-active' }
      : view.state === 'expired'
        ? { text: 'Free week over', id: 'trial-ended' }
        : eligible
          ? { text: '7 days free', id: 'trial-offer' }
          : null;
  const title = view.state === 'trial' ? 'Your free week' : view.state === 'active' ? 'You’re all set' : dinners.length ? 'Keep weeks like this.' : 'Dinner, handled. Every week.';

  // D-051: store builds show RevenueCat's paywall to anyone who needs a plan; the screen below
  // stays for the free week and active plans (status plus Customer Center), and for web and tests.
  if (revenueCatEnabled && known && showPicker) {
    const leave = () => (router.canGoBack() ? router.back() : router.replace('/week'));
    return (
      <RcPaywall
        onCompleted={(kind) => {
          void paywallCompleted(kind).then(leave);
        }}
        onClose={leave}
      />
    );
  }

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
      {dinners.length ? (
        <WeekHero dinners={dinners} badge={badge?.text ?? null} badgeTestID={badge?.id} />
      ) : badge ? (
        <Text variant="label" style={[styles.badge, { alignSelf: 'flex-start', marginBottom: space.s }]} testID={badge.id}>
          {badge.text}
        </Text>
      ) : null}
      <Text variant="title" accessibilityRole="header" style={{ marginTop: dinners.length ? space.m : 0 }}>{title}</Text>
      {trialLine ? <Text tone="muted" style={{ marginTop: space.xs }} testID="trial-next">{trialLine}</Text> : null}
      {view.state === 'active' && current ? (
        <Text tone="muted" style={{ marginTop: space.xs }} testID="plan-active">
          {`${current.label} plan. ${view.willRenew ? 'Renews' : 'Ends'} ${formatShortDate(view.periodEndsAt)}.`}
        </Text>
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
        <View style={{ marginTop: space.m, gap: space.s }} accessibilityRole="radiogroup" accessibilityLabel={eligible ? 'After the free week' : 'Choose a plan'}>
          <PlanRow product={getProduct('yearly')} selected={selected === 'yearly'} onPress={() => setSelected('yearly')} badge={`Save ${savings.percent}%`} />
          <PlanRow product={getProduct('monthly')} selected={selected === 'monthly'} onPress={() => setSelected('monthly')} />
          <PlanRow product={getProduct('weekly')} selected={selected === 'weekly'} onPress={() => setSelected('weekly')} />
        </View>
      ) : null}

      {view.state === 'trial' || view.state === 'active' ? (
        <View style={{ marginTop: space.m, gap: space.xs }}>
          <Button kind="secondary" label="Manage or cancel" onPress={() => void manage()} testID="manage-subscription" />
          {manageNote ? <Text variant="meta" accessibilityLiveRegion="polite" testID="manage-note">{manageNote}</Text> : null}
        </View>
      ) : null}

      {showPicker ? (
        <Text variant="caption" tone="muted" style={{ marginTop: space.m }} testID="legal">
          {`${eligible ? 'Charged to your Apple ID when the free week ends.' : 'Charged to your Apple ID when you confirm.'} Renews automatically unless cancelled at least 24 hours before the period ends. Cancel anytime in Settings → Subscriptions. Save ${savings.percent}% vs. 12 months of monthly (${formatMoney(savings.monthlyYearCents)}).`}
        </Text>
      ) : null}

      <View style={styles.links}>
        <Pressable
          accessibilityRole="button"
          onPress={restore}
          disabled={!known || restoreState === 'busy'}
          aria-disabled={!known || restoreState === 'busy'}
          style={({ pressed }) => [styles.restore, pressed && { backgroundColor: color.placeholder }]}
          testID="restore"
        >
          {restoreState === 'busy' ? <ActivityIndicator color={color.accent} /> : null}
          <Text variant="meta" tone="accent" style={{ textDecorationLine: 'underline' }}>Restore</Text>
        </Pressable>
        <LegalLinks pages={[{ page: 'terms', label: 'Terms' }, { page: 'privacy', label: 'Privacy' }]} testID="paywall-legal-links" />
      </View>
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
  // Full-bleed bands, like the week screen: cancels the screen's side padding.
  hero: { marginHorizontal: -(space.m + 4) },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: space.m - 4, minHeight: 60, paddingHorizontal: space.m + 4, paddingVertical: space.xs + 2 },
  heroCaption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s },
  onBand: { color: '#FFFFFF' },
  onBandSoft: { color: '#FFFFFF', opacity: 0.9 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.m - 4, minHeight: MIN_TOUCH + 8, borderRadius: radius.card, borderWidth: 1.5, borderColor: color.divider, backgroundColor: color.raised, paddingHorizontal: space.m - 4, paddingVertical: space.s },
  planOn: { borderColor: color.accent, borderWidth: 2, backgroundColor: color.accentTint },
  planHead: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.s },
  badge: { backgroundColor: SUN, color: ON_SUN, paddingHorizontal: 6, paddingVertical: 2, textTransform: 'uppercase', letterSpacing: 0.6, overflow: 'hidden' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.control, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: color.accent, borderColor: color.accent },
  tabular: { fontVariant: ['tabular-nums'] },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: MIN_TOUCH },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.m },
  restore: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: MIN_TOUCH, paddingHorizontal: space.s, marginHorizontal: -space.s, borderRadius: radius.control },
});
