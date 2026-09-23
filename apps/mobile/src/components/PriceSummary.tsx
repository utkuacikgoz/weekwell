import { budgetStatus } from '@weekwell/domain';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { budgetLine, priceHeadline } from '../copy';
import type { PriceCheck } from '../state/store';
import { color, space } from '../theme/tokens';
import { Text } from './Text';

/**
 * The week's total with its truth label always attached: sample, estimate,
 * older estimate, checked price, or hidden. Budget fit sits directly below
 * so the budget visibly maps to the total.
 */
export function PriceSummary({ priceCheck, budget, compact }: { priceCheck: PriceCheck; budget: number; compact?: boolean }) {
  const prices = priceCheck.status === 'done' ? priceCheck.prices : priceCheck.status === 'loading' ? priceCheck.previous : undefined;
  if (!prices) {
    return (
      <View style={styles.row} accessibilityLiveRegion="polite">
        <ActivityIndicator color={color.ink} />
        <Text tone="muted" style={{ marginLeft: space.s }}>Checking prices…</Text>
      </View>
    );
  }
  const h = priceHeadline(prices.total, prices.retailer, new Date());
  const b = budgetLine(budgetStatus(prices.total, budget), budget);
  return (
    <View testID="price-summary" accessible accessibilityLabel={`${h.headline}. ${h.kindLabel}. ${h.detail} ${b.text}`}>
      <Text variant="label" tone={h.tone === 'warning' ? 'warning' : 'muted'}>{h.kindLabel}</Text>
      <Text variant={h.amount ? (compact ? 'title' : 'total') : 'title'} testID="price-headline">
        {h.amount ? (
          <>
            {h.amount}
            <Text variant="bodyStrong">{`  ${h.qualifier}`}</Text>
          </>
        ) : (
          h.qualifier
        )}
      </Text>
      <Text variant="meta" tone={h.tone === 'warning' ? 'warning' : 'muted'} style={{ marginTop: space.xs }}>
        {h.detail}
      </Text>
      <Text variant="meta" tone={b.tone === 'warning' ? 'warning' : b.tone === 'ok' ? 'accent' : 'muted'} style={{ marginTop: space.xs }} testID="budget-line">
        {b.tone === 'ok' ? '✓ ' : b.tone === 'warning' ? '! ' : ''}
        {b.text}
      </Text>
      {priceCheck.status === 'loading' ? <Text variant="meta" tone="muted">Updating prices…</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
});
