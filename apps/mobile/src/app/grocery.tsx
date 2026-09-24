import {
  STORE_SECTION_LABEL,
  formatMoney,
  formatQuantity,
  type GroceryItem,
  type ItemPrice,
  type StoreSection,
} from '@weekwell/domain';
import { Redirect, router, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Layout';
import { NavBar } from '../components/NavBar';
import { AboutEstimateSheet } from '../components/PriceSheets';
import { PriceChip, PriceNotice } from '../components/PriceStatus';
import { Sheet } from '../components/Sheet';
import { Text } from '../components/Text';
import { WeekRow } from '../components/WeekParts';
import { useReducedMotion } from '../services/motion';
import { useStore } from '../state/store';
import { MIN_TOUCH, color, motion, radius, space } from '../theme/tokens';

function priceText(p: ItemPrice | undefined): { main: string; pack?: string; missing: boolean; stale: boolean } {
  if (!p) return { main: '…', missing: false, stale: false };
  if (p.status === 'missing') return { main: 'No price', missing: true, stale: false };
  const q = p.quote;
  const pack = q.packageSize === '1 count' ? `${q.quantityNeeded}` : `${q.quantityNeeded} × ${q.packageSize}`;
  return { main: formatMoney(q.totalContribution.value), pack, missing: false, stale: p.freshness === 'stale' };
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
        <Icon name="check" size={18} color={color.onAccent} strokeWidth={2.6} />
      </Animated.View>
    </View>
  );
}

function ItemRow({ item, price, checked, onToggle, onShowMeals }: { item: GroceryItem; price?: ItemPrice; checked: boolean; onToggle: () => void; onShowMeals: () => void }) {
  const p = priceText(price);
  const need = formatQuantity(item.amount, item.unit);
  const detail = item.staple ? `Need ${need}` : p.pack ? `Need ${need} · buy ${p.pack}` : `Need ${need}`;
  const n = item.mealIds.length;
  return (
    <View style={styles.item}>
      <Pressable
        testID={`item-${item.id}`}
        accessibilityRole="checkbox"
        aria-checked={checked}
        accessibilityLabel={`${item.name}. ${detail}.`}
        accessibilityHint={checked ? 'Double tap to uncheck' : 'Double tap to check off'}
        onPress={onToggle}
        style={({ pressed }) => [styles.itemMain, pressed && { backgroundColor: color.placeholder }]}
      >
        <Checkbox checked={checked} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" tone={checked ? 'muted' : 'ink'} style={checked ? styles.checkedText : undefined}>
            {item.name}
          </Text>
          <Text variant="meta" tone="muted">{detail}</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.staple ? '' : `${p.main}. `}Used in ${n} meal${n === 1 ? '' : 's'}. Show meals`}
        onPress={onShowMeals}
        style={({ pressed }) => [styles.price, pressed && { backgroundColor: color.placeholder }]}
        testID={`used-in-${item.id}`}
      >
        {!item.staple ? (
          <Text variant="bodyStrong" tone={p.missing ? 'warning' : checked ? 'muted' : 'ink'} style={styles.tabular}>
            {p.main}
          </Text>
        ) : null}
        {p.stale ? <Text variant="caption" tone="warning">older price</Text> : null}
        <View style={styles.meals}>
          <Text variant="caption" tone="accent">
            {n} meal{n === 1 ? '' : 's'}
          </Text>
          <Icon name="chevron-right" size={12} color={color.accent} />
        </View>
      </Pressable>
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
  const [sheet, setSheet] = useState<{ kind: 'about' } | { kind: 'meals'; item: GroceryItem } | null>(null);
  const [showStaples, setShowStaples] = useState(false);
  const [toast, setToast] = useState<{ id: string; name: string } | { id: null; name: string } | null>(null);

  useEffect(() => {
    analytics?.track('grocery_list_opened', { itemCount: groceryItems.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Each toast hides itself after 4 seconds; a newer toast restarts the timer.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!plan) return <Redirect href="/onboarding" />;

  const toggle = (item: GroceryItem) => {
    const wasChecked = checked.has(item.id);
    toggleChecked(item.id);
    setToast(wasChecked ? null : { id: item.id, name: item.name });
  };

  const sections = new Map<StoreSection, GroceryItem[]>();
  const staples: GroceryItem[] = [];
  for (const item of groceryItems) {
    if (item.staple) staples.push(item);
    else sections.set(item.section, [...(sections.get(item.section) ?? []), item]);
  }
  const buyable = groceryItems.length - staples.length;
  const buyableChecked = groceryItems.filter((i) => !i.staple && checked.has(i.id)).length;

  const share = async () => {
    const lines = groceryItems
      .filter((i) => !i.staple && !checked.has(i.id))
      .map((i) => `• ${i.name} — ${formatQuantity(i.amount, i.unit)}`);
    const message = `Weekwell grocery list\n\n${lines.join('\n')}\n\nPrices are estimates and can change in store.`;
    // Web preview without a system share sheet: copy instead, and say so.
    const nav = Platform.OS === 'web' ? (globalThis.navigator as (Navigator & { share?: unknown }) | undefined) : undefined;
    if (nav && !nav.share) {
      try {
        await nav.clipboard.writeText(message);
        setToast({ id: null, name: 'List copied' });
        analytics?.track('grocery_list_shared', { itemCount: lines.length });
      } catch {
        setToast({ id: null, name: 'Sharing isn’t available in this browser' });
      }
      return;
    }
    try {
      const res = await Share.share({ message });
      if (res.action !== Share.dismissedAction) analytics?.track('grocery_list_shared', { itemCount: lines.length });
    } catch {
      setToast({ id: null, name: 'Couldn’t open sharing. Try again.' });
    }
  };

  const usageMeals = sheet?.kind === 'meals' ? meals.filter((m) => sheet.item.mealIds.includes(m.id)) : [];

  return (
    <Screen
      testID="grocery-screen"
      overlay={
      toast ? (
        <View>
          <View style={styles.toast} accessibilityLiveRegion="polite" testID="check-toast">
            <Text variant="meta" tone="onAccent" style={{ flex: 1, paddingVertical: space.m - 4 }} numberOfLines={2}>
              {toast.id ? `Checked ${toast.name}` : toast.name}
            </Text>
            {toast.id ? <Pressable
              accessibilityRole="button"
              onPress={() => {
                toggleChecked(toast.id);
                setToast(null);
              }}
              style={styles.toastBtn}
              testID="undo-check"
            >
              <Text variant="label" tone="onAccent">Undo</Text>
            </Pressable> : <View style={{ width: space.m }} />}
          </View>
        </View>
      ) : null
      }
    >
      <NavBar
        backLabel="Week"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share list"
            accessibilityHint="Sends the unchecked items to Notes, Messages, or another app"
            aria-disabled={buyable === 0}
            disabled={buyable === 0}
            onPress={share}
            style={({ pressed }) => [styles.share, buyable === 0 && { opacity: 0.4 }, pressed && { backgroundColor: color.placeholder }]}
            testID="share-list"
          >
            <Icon name="share" size={20} color={color.accent} />
            <Text variant="bodyStrong" tone="accent">Share</Text>
          </Pressable>
        }
      />
      <Text variant="title" accessibilityRole="header">Grocery list</Text>

      <View style={styles.summary}>
        <Text variant="meta" tone="muted" style={{ flex: 1 }} accessible accessibilityLabel={`${checkedCount} of ${groceryItems.length} items checked`} testID="checked-count">
          {checkedCount} of {groceryItems.length} checked
        </Text>
        <PriceChip priceCheck={priceCheck} budget={plan.preferences.weeklyBudget} onAbout={() => setSheet({ kind: 'about' })} />
      </View>
      <View style={styles.progress}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${groceryItems.length ? (checkedCount / groceryItems.length) * 100 : 0}%` }]} />
        </View>
      </View>

      {/* Over budget is handled on the week, where the rebuild happens; here only data problems show. */}
      <PriceNotice priceCheck={priceCheck} budget={plan.preferences.weeklyBudget} skip={['over_budget']} onAction={() => void refreshPrices()} />

      {groceryItems.length === 0 ? (
        <View style={styles.empty} testID="empty-list">
          <Text variant="heading">Nothing to buy yet</Text>
          <Text tone="muted">Every meal is off the list. Open a meal and add it back.</Text>
          <Button label="Back to your week" kind="secondary" onPress={() => router.back()} />
        </View>
      ) : null}
      {buyable > 0 && buyableChecked === buyable ? (
        <View style={styles.done} testID="all-checked">
          <Icon name="check" size={20} color={color.accent} />
          <Text variant="bodyStrong" style={{ flex: 1 }}>Everything’s in the basket.</Text>
        </View>
      ) : null}

      {[...sections.entries()].map(([section, items]) => (
        <View key={section}>
          <Text variant="bodyStrong" accessibilityRole="header" style={styles.sectionHead}>
            {STORE_SECTION_LABEL[section]} <Text variant="meta" tone="muted">{items.length}</Text>
          </Text>
          {items.map((item) => (
            <ItemRow key={item.id} item={item} price={priceMap.get(item.id)} checked={checked.has(item.id)} onToggle={() => toggle(item)} onShowMeals={() => setSheet({ kind: 'meals', item })} />
          ))}
        </View>
      ))}

      {staples.length ? (
        <View style={{ marginTop: space.l }}>
          <Pressable
            accessibilityRole="button"
            aria-expanded={showStaples}
            accessibilityLabel={`Assumed at home, ${staples.length} items`}
            onPress={() => setShowStaples((v) => !v)}
            style={({ pressed }) => [styles.disclosure, pressed && { backgroundColor: color.placeholder }]}
            testID="staples-toggle"
          >
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Assumed at home · {staples.length}</Text>
              <Text variant="meta" tone="muted">Not priced. Check you have enough.</Text>
            </View>
            <View style={{ transform: [{ rotate: showStaples ? '-90deg' : '90deg' }] }}>
              <Icon name="chevron-right" size={20} color={color.inkMuted} />
            </View>
          </Pressable>
          {showStaples
            ? staples.map((item) => <ItemRow key={item.id} item={item} checked={checked.has(item.id)} onToggle={() => toggle(item)} onShowMeals={() => setSheet({ kind: 'meals', item })} />)
            : null}
        </View>
      ) : null}

      <AboutEstimateSheet
        visible={sheet?.kind === 'about'}
        onClose={() => setSheet(null)}
        prices={prices}
        plan={plan}
        staples={staples.map((i) => i.name)}
        onRefresh={() => {
          setSheet(null);
          void refreshPrices();
        }}
      />
      <Sheet visible={sheet?.kind === 'meals'} onClose={() => setSheet(null)} title={sheet?.kind === 'meals' ? sheet.item.name : ''} testID="used-in-sheet">
        <Text tone="muted">{sheet?.kind === 'meals' ? `Need ${formatQuantity(sheet.item.amount, sheet.item.unit)} across these meals:` : ''}</Text>
        {usageMeals.map((m) => (
          <WeekRow
            key={m.id}
            meal={m}
            onPress={() => {
              setSheet(null);
              router.push(`/meal/${m.id}` as Href);
            }}
          />
        ))}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginTop: space.xs, flexWrap: 'wrap' },
  progress: { marginBottom: space.s },
  share: { minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.s, borderRadius: radius.control },
  track: { height: 6, borderRadius: 3, backgroundColor: color.divider, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: color.accent },
  sectionHead: { marginTop: space.l, marginBottom: space.xs },
  item: { flexDirection: 'row', alignItems: 'stretch', marginHorizontal: -space.s },
  itemMain: { flex: 1, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: space.m - 4, paddingVertical: space.s, paddingLeft: space.s, borderRadius: radius.control },
  box: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: color.control, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  boxOn: { backgroundColor: color.accent, borderColor: color.accent },
  checkedText: { textDecorationLine: 'line-through' },
  price: { alignItems: 'flex-end', justifyContent: 'center', minWidth: 76, minHeight: MIN_TOUCH, paddingHorizontal: space.s, borderRadius: radius.control },
  meals: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  disclosure: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.s, paddingHorizontal: space.s, marginHorizontal: -space.s, borderRadius: radius.control },
  empty: { gap: space.s, marginTop: space.l },
  done: { flexDirection: 'row', alignItems: 'center', gap: space.s, backgroundColor: color.accentTint, borderRadius: radius.control, padding: space.m - 4, marginTop: space.s },
  toast: { flexDirection: 'row', alignItems: 'center', backgroundColor: color.ink, borderRadius: radius.control, paddingLeft: space.m },
  toastBtn: { minHeight: MIN_TOUCH, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
});
