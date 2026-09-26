import {
  PROTEIN_GOALS,
  exclusionLabel,
  getProduct,
  type EntitlementView,
  RETAILERS,
  RETAILER_LABEL,
  previewPreferenceChange,
  type HouseholdSize,
  type MaxMinutes,
  type UserPreferences,
} from '@weekwell/domain';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BudgetControl } from '../components/BudgetControl';
import { Button } from '../components/Button';
import { ExclusionsEditor } from '../components/ExclusionsEditor';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Layout';
import { LockedSheet } from '../components/LockedSheet';
import { NavBar } from '../components/NavBar';
import { ChoiceGroup } from '../components/Segmented';
import { Sheet } from '../components/Sheet';
import { Text } from '../components/Text';
import { GOAL_COPY, STORE_COPY, householdCopy, timeCopy } from '../copy';
import { canChangePlan } from '../services/access';
import { useStore } from '../state/store';
import { MIN_TOUCH, color, radius, space } from '../theme/tokens';

const TIMES: MaxMinutes[] = [20, 30, 'batch'];
const PEOPLE: HouseholdSize[] = [1, 2, '3_4'];

/** D-040 ST2: a settings list; each "Your week" row opens its own small screen. */
const PAGES = ['store', 'budget', 'goal', 'time', 'household', 'exclusions'] as const;
type SettingsPage = (typeof PAGES)[number];
const PAGE_TITLE: Record<SettingsPage, string> = { store: 'Store', budget: 'Budget', goal: 'Goal', time: 'Cooking time', household: 'Who’s eating', exclusions: 'Foods left out' };

function pageValue(k: SettingsPage, p: UserPreferences): string {
  switch (k) {
    case 'store':
      return RETAILER_LABEL[p.retailer];
    case 'budget':
      return `$${p.weeklyBudget} a week`;
    case 'goal':
      return GOAL_COPY[p.proteinGoal].label;
    case 'time':
      return timeCopy(p.maxMinutes).short;
    case 'household':
      return householdCopy(p.householdSize).label;
    case 'exclusions':
      return p.exclusions.length ? p.exclusions.map(exclusionLabel).join(', ') : 'None';
  }
}

function subscriptionValue(v: EntitlementView): string {
  switch (v.state) {
    case 'trial':
      return `Free week · ${v.daysLeft} day${v.daysLeft === 1 ? '' : 's'} left`;
    case 'active':
      return `${getProduct(v.productId).label} plan`;
    case 'expired':
      return 'Ended';
    case 'none':
      return 'Not started';
    default:
      return '';
  }
}

function SettingRow({ label, value, onPress, testID }: { label: string; value: string; onPress: () => void; testID: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}. Change`} onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.placeholder }]} testID={testID}>
      <Text variant="bodyStrong">{label}</Text>
      <Text tone="muted" numberOfLines={2} style={styles.value}>
        {value}
      </Text>
      <Icon name="chevron-right" size={18} color={color.inkMuted} />
    </Pressable>
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
  const [page, setPage] = useState<SettingsPage | null>(null);

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
      scrollToTopKey={page ?? 'list'}
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
      {page === null ? (
        <>
          <NavBar backLabel="Week" />
          <Text variant="title" accessibilityRole="header">Settings</Text>
          <Text tone="muted" style={{ marginTop: space.s }}>
            Change anything. You’ll see what changes before your plan is updated.
          </Text>

          <Text variant="label" tone="muted" style={styles.groupLabel}>YOUR WEEK</Text>
          <View style={styles.group}>
            {PAGES.map((k) => (
              <SettingRow key={k} label={PAGE_TITLE[k]} value={pageValue(k, edit)} onPress={() => setPage(k)} testID={`pref-row-${k}`} />
            ))}
          </View>

          <Text variant="label" tone="muted" style={styles.groupLabel}>APP</Text>
          <View style={styles.group}>
            <Pressable
              accessibilityRole="switch"
              aria-checked={data.hapticsEnabled}
              accessibilityLabel="Vibration. A light tap when you check an item or a plan is ready."
              onPress={() => setHaptics(!data.hapticsEnabled)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.placeholder }]}
              testID="haptics-toggle"
            >
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">Vibration</Text>
                <Text variant="meta" tone="muted">A light tap when you check an item. Never sounds.</Text>
              </View>
              <View style={[styles.track, data.hapticsEnabled && styles.trackOn]}>
                <View style={[styles.thumb, data.hapticsEnabled && styles.thumbOn]} />
              </View>
            </Pressable>
            <SettingRow label="Subscription" value={subscriptionValue(entitlementView)} onPress={() => router.push('/trial?trigger=settings')} testID="pref-row-subscription" />
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
          </View>
          {deleteError ? <Text variant="meta" tone="warning" accessibilityLiveRegion="polite" testID="delete-error">{deleteError}</Text> : null}
          <Text variant="meta" tone="muted" style={{ marginTop: space.m }}>
            {remote ? 'Your plan, preferences, and foods you leave out are saved to your Weekwell account so they sync between devices.' : 'Your plan, preferences, and foods you leave out are stored on this device only.'}
          </Text>
        </>
      ) : (
        <View testID={`pref-page-${page}`}>
          <NavBar backLabel="Settings" onBack={() => setPage(null)} />
          <Text variant="title" accessibilityRole="header" style={{ marginBottom: space.l }}>{PAGE_TITLE[page]}</Text>
          {page === 'store' ? (
            <ChoiceGroup label="Store" columns={1} value={edit.retailer} onChange={(retailer) => set({ retailer })} options={RETAILERS.map((r) => ({ value: r, label: RETAILER_LABEL[r], detail: STORE_COPY[r].detail, testID: `pref-store-${r}` }))} />
          ) : null}
          {page === 'budget' ? <BudgetControl value={edit.weeklyBudget} householdSize={edit.householdSize} onChange={(weeklyBudget) => set({ weeklyBudget })} /> : null}
          {page === 'goal' ? (
            <ChoiceGroup label="Main goal" columns={1} value={edit.proteinGoal} onChange={(proteinGoal) => set({ proteinGoal })} options={PROTEIN_GOALS.map((g) => ({ value: g, label: GOAL_COPY[g].label, detail: GOAL_COPY[g].detail, testID: `pref-goal-${g}` }))} />
          ) : null}
          {page === 'time' ? (
            <ChoiceGroup
              label="Time for dinner"
              columns={1}
              value={String(edit.maxMinutes)}
              onChange={(v) => set({ maxMinutes: v === 'batch' ? 'batch' : (Number(v) as 20 | 30) })}
              options={TIMES.map((m) => ({ value: String(m), label: timeCopy(m).label, testID: `pref-time-${m}` }))}
            />
          ) : null}
          {page === 'household' ? (
            <ChoiceGroup
              label="How many people?"
              columns={1}
              value={String(edit.householdSize)}
              onChange={(v) => set({ householdSize: v === '3_4' ? '3_4' : (Number(v) as 1 | 2) })}
              options={PEOPLE.map((h) => ({ value: String(h), label: householdCopy(h).label, testID: `pref-household-${h}` }))}
            />
          ) : null}
          {page === 'exclusions' ? <ExclusionsEditor value={edit.exclusions} maxMinutes={edit.maxMinutes} onChange={(exclusions) => set({ exclusions })} /> : null}
        </View>
      )}

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
  groupLabel: { marginTop: space.xl, marginBottom: space.s, letterSpacing: 0.6 },
  group: { backgroundColor: color.raised },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: MIN_TOUCH + 12, paddingHorizontal: space.m, paddingVertical: space.s, borderBottomWidth: 1, borderBottomColor: color.divider },
  value: { flex: 1, textAlign: 'right' },
  track: { width: 52, height: 32, borderRadius: 16, borderWidth: 2, borderColor: color.control, padding: 3, justifyContent: 'center' },
  trackOn: { backgroundColor: color.accent, borderColor: color.accent },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: color.control },
  thumbOn: { alignSelf: 'flex-end', backgroundColor: color.onAccent },
  destructive: { minHeight: MIN_TOUCH + 8, borderRadius: radius.control, backgroundColor: color.warning, alignItems: 'center', justifyContent: 'center' },
});
