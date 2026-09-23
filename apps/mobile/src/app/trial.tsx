import {
  SUBSCRIPTION_PRODUCTS,
  formatMoney,
  formatShortDate,
  getProduct,
  yearlySavingsVsMonthly,
  type ProductId,
} from '@weekwell/domain';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { ChoiceRow } from '../components/ChoiceRow';
import { Screen, SectionLabel, TopBar } from '../components/Layout';
import { Text } from '../components/Text';
import { useStore } from '../state/store';
import { color, space } from '../theme/tokens';

const PERIOD: Record<string, string> = { week: 'week', month: 'month', year: 'year' };

export default function Trial() {
  const { entitlementView: view, startTrial, restorePurchases, refreshEntitlement, analytics } = useStore();
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
  const canStart = known && view.state === 'none' && view.trialEligible && selected !== null && !busy;
  const product = selected ? getProduct(selected) : null;

  const start = async () => {
    if (!selected) return;
    setBusy(true);
    const r = await startTrial(selected);
    setBusy(false);
    setResult(r === 'ok' ? null : r === 'trial_already_used' ? 'This account has already used its free week.' : 'We couldn’t start your free week. You haven’t been charged. Try again.');
  };

  const restore = async () => {
    setRestoreState('busy');
    setRestoreState(await restorePurchases());
  };

  return (
    <Screen
      footer={
        view.state === 'none' ? (
          <>
            {product ? (
              <Text variant="meta" tone="muted" testID="charge-line">
                Free for 7 days, then {formatMoney(product.priceCents)} per {PERIOD[product.period]} unless you cancel.
              </Text>
            ) : (
              <Text variant="meta" tone="muted">Choose a plan to see exactly what you’d pay.</Text>
            )}
            <Button label="Start free week" onPress={start} disabled={!canStart} busy={busy} testID="start-trial" />
          </>
        ) : undefined
      }
    >
      <TopBar backLabel="Week" />
      <Text variant="title" accessibilityRole="header">Try Weekwell free for a week</Text>

      <Banner tone="info" title="Test build">
        <Text>Starting a free week here doesn’t charge you or create an App Store subscription.</Text>
      </Banner>

      {view.state === 'loading' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }} accessibilityLiveRegion="polite">
          <ActivityIndicator color={color.ink} />
          <Text tone="muted" style={{ marginLeft: space.s }}>Checking your subscription…</Text>
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
            Ends {formatShortDate(view.endsAt)}. {view.willRenew ? `Then ${formatMoney(getProduct(view.productId).priceCents)} per ${PERIOD[getProduct(view.productId).period]} unless you cancel.` : 'It won’t renew.'}
          </Text>
        </Banner>
      ) : null}
      {view.state === 'active' ? (
        <Banner tone="info" title={`${getProduct(view.productId).label} plan`}>
          <Text>{view.willRenew ? `Renews ${formatShortDate(view.periodEndsAt)}.` : `Ends ${formatShortDate(view.periodEndsAt)}.`}</Text>
        </Banner>
      ) : null}
      {view.state === 'expired' ? <Banner tone="warning" title="Your free week has ended" /> : null}
      {view.state === 'none' && !view.trialEligible ? <Banner tone="warning" title="This account has already used its free week." /> : null}
      {result ? <Banner tone="warning" title={result} /> : null}

      <SectionLabel>During the free week</SectionLabel>
      <Text>Everything in the app: new weekly plans, meal swaps, and your grocery list with estimated prices.</Text>

      <SectionLabel>After the free week</SectionLabel>
      {view.state === 'none' ? (
        SUBSCRIPTION_PRODUCTS.map((p) => (
          <ChoiceRow
            key={p.id}
            testID={`product-${p.id}`}
            label={`${p.label} · ${formatMoney(p.priceCents)} per ${PERIOD[p.period]}`}
            detail={p.id === 'yearly' ? `${formatMoney(savings.savedCents)} less than paying monthly for a year (${formatMoney(savings.monthlyYearCents)}), about ${savings.percent}% less.` : undefined}
            selected={selected === p.id}
            onPress={() => setSelected(p.id)}
          />
        ))
      ) : (
        SUBSCRIPTION_PRODUCTS.map((p) => (
          <Text key={p.id}>
            {p.label}: {formatMoney(p.priceCents)} per {PERIOD[p.period]}
          </Text>
        ))
      )}

      <SectionLabel>Cancelling</SectionLabel>
      <Text>
        Cancel any time in your App Store subscription settings. Cancel at least 24 hours before the free week ends and you won’t be charged. No hidden fees.
      </Text>

      <SectionLabel>Already subscribed?</SectionLabel>
      <Button label="Restore purchases" kind="secondary" onPress={restore} busy={restoreState === 'busy'} disabled={!known} testID="restore" />
      {restoreState === 'restored' ? <Text tone="accent" accessibilityLiveRegion="polite">Your subscription is restored.</Text> : null}
      {restoreState === 'nothing_to_restore' ? <Text accessibilityLiveRegion="polite" testID="restore-nothing">We didn’t find a subscription for this Apple ID.</Text> : null}
      {restoreState === 'failed' ? (
        <Banner tone="warning" title="We couldn’t reach the App Store" testID="restore-failed">
          <Text>Nothing changed. Check your connection and try again.</Text>
        </Banner>
      ) : null}
    </Screen>
  );
}
