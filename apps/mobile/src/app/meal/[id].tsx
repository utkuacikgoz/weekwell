import {
  REPAIR_ACTION_LABEL,
  findReplacement,
  formatQuantity,
  getIngredient,
  type Meal,
  type RepairAction,
} from '@weekwell/domain';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Layout';
import { MealArt } from '../../components/MealArt';
import { mealWhen } from '../../components/MealRow';
import { NavBar } from '../../components/NavBar';
import { Text } from '../../components/Text';
import { LockedSheet } from '../../components/LockedSheet';
import { Toast } from '../../components/Toast';
import { canChangePlan } from '../../services/access';
import { useStore } from '../../state/store';
import { MIN_TOUCH, color, radius, space } from '../../theme/tokens';

const ALLERGEN_LABEL: Record<string, string> = {
  dairy: 'dairy',
  gluten: 'gluten (wheat)',
  tree_nuts: 'tree nuts',
  peanuts: 'peanuts',
  soy: 'soy',
  egg: 'egg',
  fish: 'fish',
  shellfish: 'shellfish',
  sesame: 'sesame',
};

const UNAVAILABLE: Record<RepairAction, string> = {
  swap: 'No other meal fits your choices right now.',
  cheaper: 'This is already the lowest-cost option that fits.',
  more_protein: 'This already has the most protein of the options that fit.',
  faster: 'This is already the quickest option that fits.',
};

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.fact} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="bodyStrong">{value}</Text>
      <Text variant="caption" tone="muted">{label}</Text>
    </View>
  );
}

function Disclosure({ title, summary, open, onToggle, children, testID }: { title: string; summary: string; open: boolean; onToggle: () => void; children: React.ReactNode; testID?: string }) {
  return (
    <View style={styles.disclosureWrap}>
      <Pressable accessibilityRole="button" aria-expanded={open} onPress={onToggle} style={({ pressed }) => [styles.disclosure, pressed && { backgroundColor: color.placeholder }]} testID={testID}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{title}</Text>
          <Text variant="meta" tone="muted">{summary}</Text>
        </View>
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
          <Icon name="chevron-right" size={20} color={color.inkMuted} />
        </View>
      </Pressable>
      {open ? <View style={{ gap: space.s, paddingBottom: space.s }}>{children}</View> : null}
    </View>
  );
}

export default function MealDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, analytics, repairMeal, undoSwap, lastSwap, dismissSwap, toggleMealOnList, entitlementView } = useStore();
  const [locked, setLocked] = useState(false);
  const { width } = useWindowDimensions();
  const plan = data.plan;
  const meals = useMemo(() => (plan ? [...plan.dinners, ...plan.lunches] : []), [plan]);
  const meal = meals.find((m) => m.id === id);
  const [nutritionOpen, setNutritionOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'ink' | 'warning' } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (meal) analytics?.track('meal_opened', { slot: meal.slot, day: meal.day });
    // Only on open, not after a swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // A pending swap belongs to the meal it changed.
  const pending = lastSwap && lastSwap.next.id === id ? lastSwap : null;

  const options = useMemo(() => {
    if (!plan || !meal) return null;
    return (['swap', 'cheaper', 'more_protein', 'faster'] as RepairAction[]).map((a) => ({ action: a, available: findReplacement(plan, meal.id, a) !== null }));
  }, [plan, meal]);

  if (!plan) return <Redirect href="/onboarding" />;
  if (!meal) return <Redirect href="/week" />;

  const showToast = (message: string, tone: 'ink' | 'warning' = 'ink') => setToast({ message, tone });
  const repair = (action: RepairAction) => {
    if (!canChangePlan(entitlementView)) {
      setLocked(true);
      return;
    }
    const res = repairMeal(meal.id, action);
    if (!res) showToast(UNAVAILABLE[action], 'warning');
    else setToast(null);
  };
  const onList = !data.skippedMealIds.includes(meal.id);
  const usedElsewhere = (ingredientId: string): Meal[] => meals.filter((m) => m.id !== meal.id && m.ingredients.some((i) => i.ingredientId === ingredientId));
  const heroWidth = Math.min(width, 560) - 2 * (space.m + 4);
  const changedItems = pending ? pending.diff.added.length + pending.diff.removed.length + pending.diff.changed.length : 0;
  const swapOption = options?.find((o) => o.action === 'swap');

  return (
    <Screen
      testID="meal-detail"
      scrollToTopKey={pending ?? undefined}
      overlay={toast ? <Toast message={toast.message} tone={toast.tone} testID="meal-toast" /> : null}
      footer={
        pending ? (
          <View style={{ gap: space.s }} testID="swap-pending">
            <View accessibilityLiveRegion="polite">
              <Text variant="bodyStrong">Swapped to {pending.next.name}</Text>
              <Text variant="meta" tone="muted">
                {changedItems} grocery item{changedItems === 1 ? '' : 's'} changed · was {pending.previous.name}
                {pending.removedChecked > 0 ? ` · ${pending.removedChecked} checked item${pending.removedChecked === 1 ? '' : 's'} no longer needed` : ''}
              </Text>
            </View>
            <Button
              label="Keep swap"
              onPress={() => {
                dismissSwap();
                showToast('Swap kept · grocery list updated');
              }}
              testID="keep-swap"
            />
            <Button
              label="Undo"
              kind="secondary"
              onPress={() => {
                undoSwap();
                showToast('Swap undone');
              }}
              testID="undo-swap"
            />
          </View>
        ) : (
          <Button label="Start cooking" onPress={() => router.push(`/cook/${meal.id}` as Href)} testID="start-cooking" />
        )
      }
    >
      <NavBar backLabel="Week" />
      <MealArt recipeId={meal.recipeId} ingredientIds={meal.ingredients.map((i) => i.ingredientId)} width={heroWidth} height={Math.round(heroWidth * 0.5)} radius={radius.card} />
      <Text variant="label" tone="accent" style={{ marginTop: space.m }}>{mealWhen(meal)}</Text>
      <Text variant="title" accessibilityRole="header" testID="meal-name">
        {meal.name}
      </Text>

      <View style={styles.facts}>
        <Fact value={`${meal.totalMinutes} min`} label="total" />
        <Fact value={`${meal.activeMinutes} min`} label="hands-on" />
        <Fact value={`${meal.protein.value}g`} label="protein, est." />
        <Fact value={meal.slot === 'lunch' ? `${meal.servings}` : `${meal.servings}`} label={meal.slot === 'lunch' ? 'lunches' : meal.servings === 1 ? 'serving' : 'servings'} />
      </View>

      <Pressable
        testID="toggle-on-list"
        accessibilityRole="checkbox"
        aria-checked={onList}
        accessibilityLabel={onList ? 'On your grocery list' : 'Add to grocery list'}
        onPress={() => toggleMealOnList(meal.id)}
        style={({ pressed }) => [styles.listToggle, pressed && { backgroundColor: color.placeholder }]}
      >
        <View style={[styles.box, onList && styles.boxOn]}>{onList ? <Icon name="check" size={16} color={color.onAccent} strokeWidth={2.6} /> : null}</View>
        <Text variant="bodyStrong" style={{ flex: 1 }}>{onList ? 'On your grocery list' : 'Add to grocery list'}</Text>
        {!onList ? <Text variant="caption" tone="warning">Not on list</Text> : null}
      </Pressable>

      <Text variant="heading" accessibilityRole="header" style={styles.section}>Ingredients</Text>
      {meal.ingredients.map((q) => {
        const ing = getIngredient(q.ingredientId);
        const others = ing.staple ? [] : usedElsewhere(q.ingredientId);
        return (
          <View key={q.ingredientId} style={styles.ingredient} accessible accessibilityLabel={`${formatQuantity(q.amount, q.unit)} ${ing.name}${others.length ? `. Also in ${others.length} other meal${others.length === 1 ? '' : 's'}` : ''}`}>
            <Text variant="bodyStrong" style={styles.qty}>{formatQuantity(q.amount, q.unit)}</Text>
            <View style={{ flex: 1 }}>
              <Text>{ing.name}</Text>
              {others.length ? <Text variant="caption" tone="accent">Also in {others.length === 1 ? mealWhen(others[0]!) : `${others.length} other meals`}</Text> : null}
              {ing.staple ? <Text variant="caption" tone="muted">Assumed at home</Text> : null}
            </View>
          </View>
        );
      })}

      <Text variant="heading" accessibilityRole="header" style={styles.section}>Steps</Text>
      {meal.steps.map((s, i) => (
        <View key={i} style={styles.step}>
          <View style={styles.stepNo}><Text variant="label">{i + 1}</Text></View>
          <Text style={{ flex: 1 }}>{s}</Text>
        </View>
      ))}

      <Disclosure
        title="Nutrition and allergens"
        summary={`Protein estimate${meal.allergens.length ? ` · contains ${meal.allergens.map((a) => ALLERGEN_LABEL[a] ?? a).join(', ')}` : ''} · check package labels`}
        open={nutritionOpen}
        onToggle={() => setNutritionOpen((v) => !v)}
        testID="nutrition-toggle"
      >
        <Text tone="muted">About {meal.protein.value}g protein per serving, worked out from typical values for each ingredient. It isn’t lab-tested, and it isn’t medical or dietary advice.</Text>
        <Text tone="muted">{meal.allergens.length ? `Contains ${meal.allergens.map((a) => ALLERGEN_LABEL[a] ?? a).join(', ')}.` : 'No common allergens in our ingredient list.'} Brands differ, so check package labels.</Text>
      </Disclosure>

      <Text variant="heading" accessibilityRole="header" style={styles.section}>Not feeling it?</Text>
      <Text variant="meta" tone="muted" style={{ marginBottom: space.s }}>Only this meal changes, and you can undo.</Text>
      <Button label={REPAIR_ACTION_LABEL.swap} kind="secondary" disabled={!swapOption?.available || !!pending} onPress={() => repair('swap')} testID="repair-swap" />
      {!swapOption?.available ? <Text variant="meta" tone="muted">{UNAVAILABLE.swap}</Text> : null}
      <Disclosure title="More changes" summary="Cheaper, more protein, or quicker" open={moreOpen} onToggle={() => setMoreOpen((v) => !v)} testID="more-changes">
        {options
          ?.filter((o) => o.action !== 'swap')
          .map(({ action, available }) => (
            <View key={action}>
              <Button label={REPAIR_ACTION_LABEL[action]} kind="secondary" disabled={!available || !!pending} onPress={() => repair(action)} testID={`repair-${action}`} />
              {!available ? <Text variant="meta" tone="muted">{UNAVAILABLE[action]}</Text> : null}
            </View>
          ))}
      </Disclosure>
      <LockedSheet visible={locked} onClose={() => setLocked(false)} action="swap meals" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  facts: { flexDirection: 'row', marginTop: space.m, marginBottom: space.s, gap: space.s },
  fact: { flex: 1 },
  listToggle: { flexDirection: 'row', alignItems: 'center', gap: space.m - 4, minHeight: MIN_TOUCH + 8, marginTop: space.s, paddingHorizontal: space.s, marginHorizontal: -space.s, borderRadius: radius.control },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: color.control, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: color.accent, borderColor: color.accent },
  section: { marginTop: space.l + 4, marginBottom: space.s },
  ingredient: { flexDirection: 'row', paddingVertical: space.s, gap: space.m },
  qty: { width: 80 },
  step: { flexDirection: 'row', gap: space.m - 4, paddingVertical: space.s },
  stepNo: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.raised, alignItems: 'center', justifyContent: 'center' },
  disclosureWrap: { marginTop: space.l },
  disclosure: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.s, paddingHorizontal: space.s, marginHorizontal: -space.s, borderRadius: radius.control },
});
