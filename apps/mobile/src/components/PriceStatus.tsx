import { Pressable, StyleSheet, View } from 'react-native';
import { priceStatus, type PriceAction } from '../copy';
import type { PriceCheck } from '../state/store';
import { MIN_TOUCH, color, radius } from '../theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * The one price component. Same layout in every state: headline, one detail
 * line, an info button, and (only when something needs attention) one action.
 */
/** `compact` keeps only the headline and action (short screens, large text); the detail stays in the info sheet. */
export function PriceStatus({ priceCheck, budget, onAction, compact }: { priceCheck: PriceCheck; budget: number; onAction: (a: PriceAction) => void; compact?: boolean }) {
  const prices = priceCheck.status === 'done' ? priceCheck.prices : priceCheck.status === 'loading' ? priceCheck.previous : undefined;
  if (!prices) {
    return (
      <View style={styles.row} testID="price-status" accessible accessibilityLabel="Checking prices" accessibilityLiveRegion="polite">
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[styles.skeleton, { width: '62%', height: 16 }]} />
          <View style={[styles.skeleton, { width: '84%', height: 12 }]} />
        </View>
      </View>
    );
  }
  const m = priceStatus(prices.total, prices.retailer, budget, new Date());
  const attention = m.tone === 'attention';
  return (
    <View style={styles.row} testID="price-status">
      <View style={{ flex: 1 }} accessible accessibilityLabel={`${m.headline}. ${m.detail}`} testID={`price-${m.variant}`}>
        <Text variant="bodyStrong" tone={attention ? 'warning' : 'ink'} testID="price-headline">
          {m.headline}
        </Text>
        {!compact || priceCheck.status === 'loading' ? (
          <Text variant="meta" tone="muted" testID="price-detail">
            {compact ? 'Updating…' : m.detail}
            {!compact && priceCheck.status === 'loading' ? ' · updating…' : ''}
          </Text>
        ) : null}
        {m.action.kind !== 'about' ? (
          <Pressable accessibilityRole="button" onPress={() => onAction(m.action.kind)} style={({ pressed }) => [styles.action, pressed && styles.pressed]} testID={`price-action-${m.action.kind}`}>
            <Text variant="label" tone="accent">{m.action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="About this estimate"
        onPress={() => onAction('about')}
        style={({ pressed }) => [styles.info, pressed && styles.pressed]}
        testID="price-about"
      >
        <Icon name="info" size={22} color={color.inkMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', minHeight: MIN_TOUCH },
  info: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, marginRight: -10, marginTop: -8 },
  action: { minHeight: MIN_TOUCH, justifyContent: 'center', alignSelf: 'flex-start', marginBottom: -8 },
  pressed: { backgroundColor: color.placeholder },
  skeleton: { backgroundColor: color.placeholder, borderRadius: 4 },
});
