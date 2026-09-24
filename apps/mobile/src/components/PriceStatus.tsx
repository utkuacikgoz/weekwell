import { Pressable, StyleSheet, View } from 'react-native';
import { priceModel, type PriceAction, type PriceModel, type PriceVariant } from '../copy';
import type { PriceCheck } from '../state/store';
import { MIN_TOUCH, color, radius, space } from '../theme/tokens';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

export function usePriceModel(priceCheck: PriceCheck, budget: number): PriceModel | null {
  const prices = priceCheck.status === 'done' ? priceCheck.prices : priceCheck.status === 'loading' ? priceCheck.previous : undefined;
  return prices ? priceModel(prices.total, prices.retailer, budget, new Date()) : null;
}

/**
 * The one place the week's total lives: amount plus what kind of number it is
 * ("$73 · sample est."). Tapping it opens "About this estimate".
 */
export function PriceChip({ priceCheck, budget, onAbout }: { priceCheck: PriceCheck; budget: number; onAbout: () => void }) {
  const m = usePriceModel(priceCheck, budget);
  const updating = priceCheck.status === 'loading';
  const label = m ? `${m.summary}${updating ? ' Updating.' : ''} About this estimate` : 'Checking prices';
  return (
    <Pressable
      testID="price-about"
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-busy={updating}
      onPress={onAbout}
      disabled={!m}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      <View testID="price-chip" style={styles.chipText}>
        {m ? (
          <>
            <Text variant="bodyStrong" tone={m.amount ? 'ink' : 'muted'} style={styles.tabular} testID="price-amount">
              {m.amount ?? 'No total'}
            </Text>
            <Text variant="caption" tone="muted" testID="price-kind">
              {updating ? 'updating…' : m.amount ? m.kind : ''}
            </Text>
          </>
        ) : (
          <View style={{ gap: 4 }} accessibilityLiveRegion="polite">
            <View style={[styles.skeleton, { width: 44, height: 16 }]} />
            <View style={[styles.skeleton, { width: 64, height: 10 }]} />
          </View>
        )}
      </View>
      {m ? <Icon name="info" size={18} color={color.inkMuted} /> : null}
    </Pressable>
  );
}

/**
 * Only when the total needs attention: one neutral note in the content with
 * one next step. Not red: being over budget is a planning outcome, not an error.
 */
export function PriceNotice({ priceCheck, budget, onAction, secondary, skip }: { priceCheck: PriceCheck; budget: number; onAction: (a: PriceAction) => void; secondary?: { label: string; onPress: () => void }; skip?: PriceVariant[] }) {
  const m = usePriceModel(priceCheck, budget);
  if (!m?.notice || skip?.includes(m.variant)) return null;
  const n = m.notice;
  return (
    <View style={styles.notice} testID="price-notice" accessibilityLiveRegion="polite">
      <View testID={`price-${m.variant}`} style={{ gap: 2 }}>
        <Text variant="bodyStrong" testID="price-headline">{n.title}</Text>
        <Text variant="meta" tone="muted">{n.detail}</Text>
      </View>
      <View style={styles.noticeActions}>
        <View style={{ flexGrow: 1 }}>
          <Button label={n.action.label} kind="secondary" onPress={() => onAction(n.action.kind)} testID={`price-action-${n.action.kind}`} />
        </View>
        {secondary ? <Button label={secondary.label} kind="quiet" onPress={secondary.onPress} testID="price-secondary" /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', gap: space.s, paddingRight: space.s, borderRadius: radius.control, flexShrink: 0 },
  chipText: { justifyContent: 'center' },
  pressed: { backgroundColor: color.placeholder },
  tabular: { fontVariant: ['tabular-nums'] },
  skeleton: { backgroundColor: color.placeholder, borderRadius: 4 },
  notice: { backgroundColor: color.raised, borderRadius: radius.card, padding: space.m, gap: space.m - 4, marginTop: space.m },
  noticeActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.s },
});
