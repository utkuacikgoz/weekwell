import {
  PROTEIN_GOALS,
  RETAILERS,
  RETAILER_LABEL,
  previewPreferenceChange,
  type HouseholdSize,
  type MaxMinutes,
  type UserPreferences,
} from '@weekwell/domain';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { BudgetControl } from '../components/BudgetControl';
import { Button } from '../components/Button';
import { ExclusionsEditor } from '../components/ExclusionsEditor';
import { Screen } from '../components/Layout';
import { LockedSheet } from '../components/LockedSheet';
import { NavBar } from '../components/NavBar';
import { ChoiceGroup } from '../components/Segmented';
import { Sheet } from '../components/Sheet';
import { Text } from '../components/Text';
import { GOAL_COPY, householdCopy, timeCopy } from '../copy';
import { canChangePlan } from '../services/access';
import { useStore } from '../state/store';
import { MIN_TOUCH, color, radius, space } from '../theme/tokens';

const TIMES: MaxMinutes[] = [20, 30, 'batch'];
const PEOPLE: HouseholdSize[] = [1, 2, '3_4'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="heading" accessibilityRole="header" style={{ marginBottom: space.m }}>{title}</Text>
      {children}
    </View>
  );
}

export default function Preferences() {
  const { data, applyPlan, setHaptics, deleteAllData, entitlementView, remote, signedIn, signOut } = useStore();
  const plan = data.plan;
  const [edit, setEdit] = useState<UserPreferences | null>(plan?.preferences ?? null);
  const [sheet, setSheet] = useState<'delete' | 'locked' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const changed = !!plan && !!edit && JSON.stringify(edit) !== JSON.stringify(plan.preferences);
  const preview = useMemo(
    () => (plan && edit && changed ? previewPreferenceChange(plan, edit, { ownerId: plan.ownerId, planId: plan.id, now: new Date() }) : null),
    [plan, edit, changed],
  );

  if (!plan || !edit) return <Redirect href="/onboarding" />;
  const set = (patch: Partial<UserPreferences>) => setEdit({ ...edit, ...patch });
  const apply = async () => {
    if (!preview || preview.blocked) return;
    if (preview.mealsChanged.length > 0 && !canChangePlan(entitlementView)) {
      setSheet('locked');
      return;
    }
    setBusy(true);
    const res = await applyPlan({ kind: 'preferences', prefs: edit, localPlan: preview.plan }, preview.mealsChanged.length > 0 ? `Preferences updated · ${preview.summary}` : undefined);
    setBusy(false);
    if (res === 'ok') router.back();
    else setError('We couldn’t save your changes. Check your connection and try again.');
  };

  return (
    <Screen
      testID="preferences-screen"
      footer={
        changed && preview ? (
          <>
            <View testID="preference-preview" accessibilityLiveRegion="polite">
              <Text variant="bodyStrong" tone={preview.blocked ? 'warning' : 'ink'}>{preview.blocked ? 'This change doesn’t fit a full week' : 'What will change'}</Text>
              <Text variant="meta" tone="muted">{preview.summary}</Text>
              {!preview.blocked && preview.mealsChanged.length === 0 && preview.diff.removed.length === 0 ? null : !preview.blocked ? (
                <Text variant="meta" tone="muted">Checked items that are still needed stay checked.</Text>
              ) : null}
            </View>
            {error ? <Text variant="meta" tone="warning" accessibilityLiveRegion="polite">{error}</Text> : null}
            <Button label="Apply changes" disabled={!!preview.blocked} busy={busy} onPress={() => void apply()} testID="apply-preferences" />
            <Button label="Keep my current plan" kind="secondary" onPress={() => setEdit(plan.preferences)} testID="discard-preferences" />
          </>
        ) : undefined
      }
    >
      <NavBar backLabel="Week" />
      <Text variant="title" accessibilityRole="header">Preferences</Text>
      <Text tone="muted" style={{ marginTop: space.s }}>
        Change anything. You’ll see what changes before your plan is updated.
      </Text>

      <Section title="Store and budget">
        <ChoiceGroup
          label="Store"
          columns={2}
          value={edit.retailer}
          onChange={(retailer) => set({ retailer })}
          options={RETAILERS.map((r) => ({ value: r, label: RETAILER_LABEL[r], testID: `pref-store-${r}` }))}
        />
        <Text variant="label">Weekly grocery budget</Text>
        <BudgetControl value={edit.weeklyBudget} householdSize={edit.householdSize} onChange={(weeklyBudget) => set({ weeklyBudget })} />
      </Section>

      <Section title="Your week">
        <ChoiceGroup label="Main goal" columns={2} value={edit.proteinGoal} onChange={(proteinGoal) => set({ proteinGoal })} options={PROTEIN_GOALS.map((g) => ({ value: g, label: GOAL_COPY[g].label }))} />
        <ChoiceGroup
          label="Time for dinner"
          value={String(edit.maxMinutes)}
          onChange={(v) => set({ maxMinutes: v === 'batch' ? 'batch' : (Number(v) as 20 | 30) })}
          options={TIMES.map((m) => ({ value: String(m), label: m === 'batch' ? 'Batch cook' : timeCopy(m).short, testID: `pref-time-${m}` }))}
        />
        <ChoiceGroup
          label="People eating"
          value={String(edit.householdSize)}
          onChange={(v) => set({ householdSize: v === '3_4' ? '3_4' : (Number(v) as 1 | 2) })}
          options={PEOPLE.map((h) => ({ value: String(h), label: householdCopy(h).label, testID: `pref-household-${h}` }))}
        />
      </Section>

      <Section title="Foods to leave out">
        <ExclusionsEditor value={edit.exclusions} maxMinutes={edit.maxMinutes} onChange={(exclusions) => set({ exclusions })} />
      </Section>

      <Section title="Feedback">
        <Pressable
          accessibilityRole="switch"
          aria-checked={data.hapticsEnabled}
          accessibilityLabel="Vibration feedback"
          onPress={() => setHaptics(!data.hapticsEnabled)}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.placeholder }]}
          testID="haptics-toggle"
        >
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Vibration</Text>
            <Text variant="meta" tone="muted">A light tap when you check an item or a plan is ready. Weekwell never plays sounds.</Text>
          </View>
          <View pointerEvents="none" aria-hidden importantForAccessibility="no-hide-descendants">
            <Switch value={data.hapticsEnabled} trackColor={{ true: color.accent, false: color.control }} />
          </View>
        </Pressable>
      </Section>

      <Section title="Your data">
        <Text variant="meta" tone="muted">
          {remote ? 'Your plan, preferences, and foods you leave out are saved to your Weekwell account so they sync between devices.' : 'Your plan, preferences, and foods you leave out are stored on this device only.'}
        </Text>
        {remote && signedIn ? (
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await signOut();
              router.replace('/onboarding');
            }}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.placeholder }]}
            testID="sign-out"
          >
            <Text variant="bodyStrong">Sign out</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" onPress={() => setSheet('delete')} style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.placeholder }]} testID="delete-data">
          <Text variant="bodyStrong" tone="warning">{remote ? 'Delete my account' : 'Delete my data'}</Text>
        </Pressable>
        {deleteError ? <Text variant="meta" tone="warning" accessibilityLiveRegion="polite" testID="delete-error">{deleteError}</Text> : null}
      </Section>

      <Sheet
        visible={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title="Delete your plan and preferences?"
        testID="delete-sheet"
        footer={
          <>
            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                const res = await deleteAllData();
                setSheet(null);
                if (res === 'ok') router.replace('/onboarding');
                else setDeleteError('We couldn’t delete your account right now. Nothing was removed. Check your connection and try again.');
              }}
              style={({ pressed }) => [styles.destructive, pressed && { opacity: 0.85 }]}
              testID="confirm-delete"
            >
              <Text variant="bodyStrong" tone="onAccent">Delete everything</Text>
            </Pressable>
            <Button label="Cancel" kind="secondary" onPress={() => setSheet(null)} />
          </>
        }
      >
        <Text>
          {remote
            ? 'This deletes your Weekwell account with its plans, grocery checks, preferences, and foods you leave out, on every device. It can’t be undone.'
            : 'This removes your plan, grocery checks, preferences, and foods you leave out from this device. It can’t be undone.'}
        </Text>
      </Sheet>
      <LockedSheet visible={sheet === 'locked'} onClose={() => setSheet(null)} action="change the meals in your plan" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: MIN_TOUCH + 12, paddingHorizontal: space.s, marginHorizontal: -space.s, borderRadius: radius.control },
  destructive: { minHeight: MIN_TOUCH + 8, borderRadius: radius.control, backgroundColor: color.warning, alignItems: 'center', justifyContent: 'center' },
});
