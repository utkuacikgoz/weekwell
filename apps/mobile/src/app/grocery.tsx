import {
  STORE_SECTION_LABEL,
  formatMoney,
  formatQuantity,
  type GroceryItem,
  type ItemPrice,
  type Meal,
  type StoreSection,
} from '@weekwell/domain';
import { Redirect, router, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, Share, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { Screen, SectionLabel, TopBar } from '../components/Layout';
import { mealWhen } from '../components/MealRow';
import { PriceSummary } from '../components/PriceSummary';
import { Text } from '../components/Text';
import { useReducedMotion } from '../services/motion';
import { useStore } from '../state/store';
import { MIN_TOUCH, color, motion, space } from '../theme/tokens';

function priceText(p: ItemPrice | undefined): { main: string; sub?: string; missing: boolean } {
  if (!p) return { main: 'Checking…', missing: false };
  if (p.status === 'missing') return { main: 'No price', sub: p.reason === 'expired' ? 'Price too old to show' : 'Couldn’t check', missing: true };
  const q = p.quote;
  const label = p.freshness === 'stale' ? ' · older' : '';
  return { main: formatMoney(q.totalContribution.value), sub: `${q.quantityNeeded} × ${q.packageSize}${label}`, missing: false };
}

function Checkbox({ checked }: { checked: boolean }) {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(checked ? 1 : 0));
  useEffect(() => {
    const to = checked ? 1 : 0;
    if (reduced) scale.setValue(to);
    else Animated.timing(scale, { toValue: to, duration: motion.check.durationMs, useNativeDriver: true }).start();
  }, [checked, reduced, scale]);
  return (
    <View style={[styles.box, checked && styles.boxOn]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Text variant="bodyStrong" tone="onAccent">✓</Text>
      </Animated.View>
    </View>
  );
}

function ItemRow({ item, price, checked, meals, onToggle }: { item: GroceryItem; price?: ItemPrice; checked: boolean; meals: Meal[]; onToggle: () => void }) {
  const p = priceText(price);
  const qty = formatQuantity(item.amount, item.unit);
  const usedIn = item.mealIds.map((id) => meals.find((m) => m.id === id)).filter((m): m is Meal => !!m);
  return (
    <View style={styles.item}>
      <Pressable
        testID={`item-${item.id}`}
        accessibilityRole="checkbox"
        aria-checked={checked}
        accessibilityLabel={`${item.name}, need ${qty}. ${item.staple ? 'Assumed at home.' : `${p.main}${p.sub ? `, ${p.sub}` : ''}.`}`}
        accessibilityHint={checked ? 'Double tap to uncheck' : 'Double tap to check off'}
        onPress={onToggle}
        style={({ pressed }) => [styles.itemMain, pressed && { backgroundColor: color.placeholder }]}
      >
        <Checkbox checked={checked} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" style={checked ? styles.checkedText : undefined}>{item.name}</Text>
          <Text variant="meta" tone="muted">Need {qty}</Text>
        </View>
        {!item.staple ? (
          <View style={styles.price}>
            <Text variant="bodyStrong" tone={p.missing ? 'warning' : 'ink'}>{p.main}</Text>
            {p.sub ? <Text variant="meta" tone={p.missing ? 'warning' : 'muted'}>{p.sub}</Text> : null}
          </View>
        ) : null}
      </Pressable>
      <View style={styles.usedIn}>
        <Text variant="meta" tone="muted">For </Text>
        {usedIn.map((m, i) => (
          <Pressable key={m.id} accessibilityRole="link" accessibilityLabel={`Open ${mealWhen(m)}: ${m.name}`} onPress={() => router.push(`/meal/${m.id}` as Href)} style={styles.mealLink}>
            <Text variant="meta" tone="accent" style={{ textDecorationLine: 'underline' }}>
              {mealWhen(m)}
            </Text>
            {i < usedIn.length - 1 ? <Text variant="meta" tone="muted">, </Text> : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function Grocery() {
  const { data, groceryItems, priceCheck, toggleChecked, refreshPrices, analytics } = useStore();
  const plan = data.plan;
  const meals = useMemo(() => (plan ? [...plan.dinners, ...plan.lunches] : []), [plan]);
  const prices = priceCheck.status === 'done' ? priceCheck.prices : priceCheck.status === 'loading' ? priceCheck.previous : undefined;
  const priceMap = useMemo(() => new Map(prices?.items ?? []), [prices]);
  const checked = new Set(data.checked);
  const checkedCount = groceryItems.filter((i) => checked.has(i.id)).length;

  useEffect(() => {
    analytics?.track('grocery_list_opened', { itemCount: groceryItems.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!plan) return <Redirect href="/onboarding" />;

  const sections = new Map<StoreSection, GroceryItem[]>();
  const staples: GroceryItem[] = [];
  for (const item of groceryItems) {
    if (item.staple) staples.push(item);
    else sections.set(item.section, [...(sections.get(item.section) ?? []), item]);
  }

  const share = async () => {
    const lines = groceryItems
      .filter((i) => !i.staple)
      .map((i) => `${checked.has(i.id) ? '✓' : '○'} ${i.name} — ${formatQuantity(i.amount, i.unit)}`);
    try {
      await Share.share({ message: `Weekwell grocery list\n\n${lines.join('\n')}\n\nPrices are estimates and can change in store.` });
      analytics?.track('grocery_list_shared', { itemCount: lines.length });
    } catch {
      // Share sheet dismissed or unavailable; nothing to do.
    }
  };

  return (
    <Screen footer={<Button label="Share list" kind="primary" onPress={share} disabled={groceryItems.length === 0} testID="share-list" accessibilityHint="Send this list to Notes, Messages, or another app" />}>
      <TopBar backLabel="Week" />
      <Text variant="title" accessibilityRole="header">Grocery list</Text>
      <Text variant="bodyStrong" accessibilityLiveRegion="polite" testID="checked-count" style={{ marginTop: space.xs }}>
        {checkedCount} of {groceryItems.length} items checked
      </Text>
      <View style={{ marginTop: space.m }}>
        <PriceSummary priceCheck={priceCheck} budget={plan.preferences.weeklyBudget} compact />
      </View>
      <Button label="Check prices again" kind="quiet" onPress={() => void refreshPrices()} disabled={priceCheck.status === 'loading'} testID="refresh-prices" />

      {groceryItems.length === 0 ? (
        <Text tone="muted" style={{ marginTop: space.l }} testID="empty-list">
          Your list is empty because every meal is off the list. Open a meal and tick “On your grocery list” to add it back.
        </Text>
      ) : null}
      {checkedCount > 0 && checkedCount === groceryItems.length ? (
        <Text tone="accent" variant="bodyStrong" style={{ marginTop: space.m }}>Everything is checked. Tap an item to uncheck it.</Text>
      ) : null}

      {[...sections.entries()].map(([section, items]) => (
        <View key={section}>
          <SectionLabel>{STORE_SECTION_LABEL[section]}</SectionLabel>
          {items.map((item) => (
            <ItemRow key={item.id} item={item} price={priceMap.get(item.id)} checked={checked.has(item.id)} meals={meals} onToggle={() => toggleChecked(item.id)} />
          ))}
        </View>
      ))}
      {staples.length ? (
        <View>
          <SectionLabel>Assumed at home</SectionLabel>
          <Text variant="meta" tone="muted">Not priced. Check you have enough.</Text>
          {staples.map((item) => (
            <ItemRow key={item.id} item={item} checked={checked.has(item.id)} meals={meals} onToggle={() => toggleChecked(item.id)} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { borderBottomWidth: 1, borderBottomColor: color.divider, paddingBottom: space.xs },
  itemMain: { minHeight: MIN_TOUCH + 12, flexDirection: 'row', alignItems: 'center', gap: space.m - 4, paddingTop: space.s },
  box: { width: 26, height: 26, borderRadius: 4, borderWidth: 2, borderColor: color.control, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  boxOn: { backgroundColor: color.accent, borderColor: color.accent },
  checkedText: { textDecorationLine: 'line-through', color: color.inkMuted },
  price: { alignItems: 'flex-end', maxWidth: '40%' },
  usedIn: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginLeft: 38 },
  mealLink: { minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center' },
});
