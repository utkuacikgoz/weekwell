import {
  PROTEIN_GOALS,
  RETAILERS,
  previewPreferenceChange,
  type HouseholdSize,
  type MaxMinutes,
  type UserPreferences,
} from '@weekwell/domain';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Banner } from '../components/Banner';
import { BudgetControl } from '../components/BudgetControl';
import { Button } from '../components/Button';
import { ChoiceRow } from '../components/ChoiceRow';
import { ExclusionsEditor } from '../components/ExclusionsEditor';
import { Divider, Screen, SectionLabel, TopBar } from '../components/Layout';
import { mealWhen } from '../components/MealRow';
import { Text } from '../components/Text';
import { GOAL_COPY, STORE_COPY, householdCopy, timeCopy } from '../copy';
import { useStore } from '../state/store';
import { color, space } from '../theme/tokens';

const TIMES: MaxMinutes[] = [20, 30, 'batch'];
const HOUSEHOLDS: HouseholdSize[] = [1, 2, '3_4'];

export default function Preferences() {
  const { data, applyPlan, setHaptics, deleteAllData } = useStore();
  const plan = data.plan;
  const [edit, setEdit] = useState<UserPreferences | null>(plan?.preferences ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const changed = !!plan && !!edit && JSON.stringify(edit) !== JSON.stringify(plan.preferences);
  const preview = useMemo(
    () => (plan && edit && changed ? previewPreferenceChange(plan, edit, { ownerId: plan.ownerId, planId: plan.id, now: new Date() }) : null),
    [plan, edit, changed],
  );

  if (!plan || !edit) return <Redirect href="/onboarding" />;
  const set = (patch: Partial<UserPreferences>) => setEdit({ ...edit, ...patch });

  return (
    <Screen
      footer={
        changed ? (
          <>
            <Button
              label="Apply changes"
              disabled={!preview || !!preview.blocked}
              onPress={() => {
                if (preview && !preview.blocked) {
                  applyPlan(preview.plan);
                  router.back();
                }
              }}
              testID="apply-preferences"
            />
            <Button label="Keep my current plan" kind="secondary" onPress={() => setEdit(plan.preferences)} testID="discard-preferences" />
          </>
        ) : undefined
      }
    >
      <TopBar backLabel="Week" />
      <Text variant="title" accessibilityRole="header">Preferences</Text>
      <Text tone="muted" style={{ marginTop: space.s }}>
        Change anything. We’ll show exactly what changes before your plan is updated.
      </Text>

      {preview ? (
        <Banner tone={preview.blocked ? 'warning' : 'info'} title={preview.blocked ? 'This change doesn’t fit a full week' : 'What will change'} testID="preference-preview">
          <Text>{preview.summary}</Text>
          {preview.mealsChanged.map((m) => (
            <Text key={m.id} variant="meta">• {mealWhen(m)}: {m.name}</Text>
          ))}
          {preview.diff.removed.filter((i) => data.checked.includes(i.id)).length > 0 ? (
            <Text variant="meta">Some checked items will no longer be needed.</Text>
          ) : null}
          {!preview.blocked ? <Text variant="meta">Checked items that are still needed stay checked.</Text> : null}
        </Banner>
      ) : null}

      <SectionLabel>Store</SectionLabel>
      {RETAILERS.map((r) => (
        <ChoiceRow key={r} label={STORE_COPY[r].label} selected={edit.retailer === r} onPress={() => set({ retailer: r })} testID={`pref-store-${r}`} />
      ))}

      <SectionLabel>Weekly budget</SectionLabel>
      <BudgetControl value={edit.weeklyBudget} householdSize={edit.householdSize} onChange={(weeklyBudget) => set({ weeklyBudget })} />

      <SectionLabel>Main goal</SectionLabel>
      {PROTEIN_GOALS.map((g) => (
        <ChoiceRow key={g} label={GOAL_COPY[g].label} selected={edit.proteinGoal === g} onPress={() => set({ proteinGoal: g })} />
      ))}

      <SectionLabel>Cooking time</SectionLabel>
      {TIMES.map((m) => (
        <ChoiceRow key={String(m)} label={timeCopy(m).label} selected={edit.maxMinutes === m} onPress={() => set({ maxMinutes: m })} testID={`pref-time-${m}`} />
      ))}

      <SectionLabel>Household</SectionLabel>
      {HOUSEHOLDS.map((h) => (
        <ChoiceRow key={String(h)} label={householdCopy(h).label} selected={edit.householdSize === h} onPress={() => set({ householdSize: h })} testID={`pref-household-${h}`} />
      ))}

      <SectionLabel>Leave out</SectionLabel>
      <ExclusionsEditor value={edit.exclusions} maxMinutes={edit.maxMinutes} onChange={(exclusions) => set({ exclusions })} />

      <Divider spaced />
      <SectionLabel>Feedback</SectionLabel>
      <Pressable
        accessibilityRole="switch"
        aria-checked={data.hapticsEnabled}
        accessibilityLabel="Vibration feedback"
        onPress={() => setHaptics(!data.hapticsEnabled)}
        style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: space.m }}
        testID="haptics-toggle"
      >
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">Vibration</Text>
          <Text variant="meta" tone="muted">A light tap when you check an item or a plan is ready. Weekwell never plays sounds.</Text>
        </View>
        {/* Visual only: the whole row is the control. */}
        <View pointerEvents="none" aria-hidden importantForAccessibility="no-hide-descendants">
          <Switch value={data.hapticsEnabled} trackColor={{ true: color.accent, false: color.control }} />
        </View>
      </Pressable>

      <SectionLabel>Your data</SectionLabel>
      <Text variant="meta" tone="muted">
        Your plan, preferences, and exclusions are stored on this device only. Deleting removes them and starts over.
      </Text>
      <View style={{ marginTop: space.s }}>
        {confirmDelete ? (
          <Banner tone="warning" title="Delete your plan and preferences?">
            <Text>This can’t be undone.</Text>
            <View style={{ flexDirection: 'row', gap: space.m, marginTop: space.s }}>
              <Button
                label="Delete"
                kind="secondary"
                onPress={async () => {
                  await deleteAllData();
                  router.replace('/onboarding');
                }}
                testID="confirm-delete"
              />
              <Button label="Cancel" kind="quiet" onPress={() => setConfirmDelete(false)} />
            </View>
          </Banner>
        ) : (
          <Button label="Delete my data" kind="quiet" onPress={() => setConfirmDelete(true)} testID="delete-data" />
        )}
      </View>
    </Screen>
  );
}
