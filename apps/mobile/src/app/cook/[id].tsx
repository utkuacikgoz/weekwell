import { activateKeepAwakeAsync, deactivateKeepAwake, isAvailableAsync } from 'expo-keep-awake';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Layout';
import { NavBar } from '../../components/NavBar';
import { Text } from '../../components/Text';
import { stepMinutes } from '../../services/cooking';
import { haptic } from '../../services/haptics';
import { useStore } from '../../state/store';
import { MIN_TOUCH, color, radius, space } from '../../theme/tokens';

const KEEP_AWAKE_TAG = 'weekwell-cooking';

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Cooking mode: one step at a time, large text, readable at arm's length.
 * - The screen stays awake while it's open (where the device allows).
 * - Steps with a time offer a timer. It runs from an end time, so it survives
 *   leaving the screen, and it finishes with a haptic and a message. No sound (D-018).
 * - The step and timer are saved, so an accidental back or app switch resumes
 *   from "Continue cooking" on the week and recipe screens.
 */
export default function Cook() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, setCooking } = useStore();
  const saved = data.cooking?.mealId === id ? data.cooking : null;
  const [step, setStep] = useState(saved?.step ?? 0);
  const [endsAt, setEndsAt] = useState<number | null>(saved?.timerEndsAt ? Date.parse(saved.timerEndsAt) : null);
  const [minutes, setMinutes] = useState<number | null>(saved?.timerMinutes ?? null);
  const [pausedMs, setPausedMs] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const meal = data.plan ? [...data.plan.dinners, ...data.plan.lunches].find((m) => m.id === id) : undefined;

  useEffect(() => {
    let active = false;
    void isAvailableAsync()
      .then((ok) => (ok ? activateKeepAwakeAsync(KEEP_AWAKE_TAG).then(() => (active = true)) : undefined))
      .catch(() => undefined);
    return () => {
      if (active) void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, []);

  // Save progress so it can be resumed.
  useEffect(() => {
    if (!meal) return;
    setCooking({ mealId: meal.id, step, timerEndsAt: endsAt ? new Date(endsAt).toISOString() : null, timerMinutes: minutes, updatedAt: new Date().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meal?.id, step, endsAt, minutes]);

  const remaining = endsAt ? endsAt - now : pausedMs;
  const finished = endsAt !== null && remaining !== null && remaining <= 0;
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);
  useEffect(() => {
    if (finished) haptic.success();
  }, [finished]);

  if (!meal) return <Redirect href="/week" />;
  const total = meal.steps.length;
  const last = step === total - 1;
  const text = meal.steps[step] ?? '';
  const suggested = stepMinutes(text);
  const timerOn = endsAt !== null || pausedMs !== null;

  const clearTimer = () => {
    setEndsAt(null);
    setPausedMs(null);
    setMinutes(null);
  };
  const go = (next: number) => {
    // A running timer keeps going across steps (e.g. rice simmering while you prep).
    if (finished) clearTimer();
    setStep(next);
  };

  return (
    <Screen
      testID="cook-screen"
      footer={
        <View style={styles.footer}>
          <View style={{ flex: 1 }}>
            <Button label="Back" kind="secondary" disabled={step === 0} onPress={() => go(Math.max(0, step - 1))} testID="cook-prev" />
          </View>
          <View style={{ flex: 2 }}>
            <Button
              label={last ? 'Done' : 'Next step'}
              onPress={() => {
                if (!last) return go(step + 1);
                setCooking(null);
                router.back();
              }}
              testID="cook-next"
            />
          </View>
        </View>
      }
    >
      <NavBar backLabel="Recipe" />
      <Text variant="label" tone="muted">{meal.name}</Text>
      <View style={styles.progressRow} accessible accessibilityLabel={`Step ${step + 1} of ${total}`}>
        <Text variant="bodyStrong" tone="accent" testID="cook-step-count">Step {step + 1} of {total}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${((step + 1) / total) * 100}%` }]} />
        </View>
      </View>
      <Text style={styles.stepText} accessibilityLiveRegion="polite" testID="cook-step">
        {text}
      </Text>

      {timerOn ? (
        <View style={[styles.timer, finished && styles.timerDone]} testID="cook-timer" accessibilityLiveRegion="polite">
          <Icon name="timer" size={22} color={finished ? color.accent : color.ink} />
          <View style={{ flex: 1 }}>
            <Text variant="heading" style={styles.tabular} testID="cook-timer-time">{finished ? 'Time’s up' : mmss(remaining ?? 0)}</Text>
            <Text variant="caption" tone="muted">{finished ? 'Check it’s done before moving on.' : `${minutes} min timer${pausedMs !== null ? ' · paused' : ''}`}</Text>
          </View>
          {!finished ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (endsAt) {
                  setPausedMs(endsAt - Date.now());
                  setEndsAt(null);
                } else if (pausedMs !== null) {
                  setEndsAt(Date.now() + pausedMs);
                  setPausedMs(null);
                }
              }}
              style={styles.timerBtn}
              testID="cook-timer-pause"
            >
              <Text variant="label" tone="accent">{pausedMs !== null ? 'Resume' : 'Pause'}</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel={finished ? 'Dismiss timer' : 'Cancel timer'} onPress={clearTimer} style={styles.timerBtn} testID="cook-timer-cancel">
            <Icon name="close" size={18} color={color.inkMuted} />
          </Pressable>
        </View>
      ) : suggested ? (
        <View style={{ marginTop: space.l, alignSelf: 'flex-start' }}>
          <Button
            label={`Start ${suggested} min timer`}
            kind="secondary"
            onPress={() => {
              setNow(Date.now());
              setMinutes(suggested);
              setEndsAt(Date.now() + suggested * 60_000);
            }}
            testID="cook-timer-start"
          />
        </View>
      ) : null}

      {step + 1 < total ? (
        <View style={{ marginTop: space.xl }}>
          <Text variant="label" tone="muted">Next</Text>
          <Text tone="muted">{meal.steps[step + 1]}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressRow: { gap: space.s, marginTop: space.l, marginBottom: space.l },
  track: { height: 6, borderRadius: 3, backgroundColor: color.divider, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: color.accent },
  stepText: { fontSize: 24, lineHeight: 32 },
  footer: { flexDirection: 'row', gap: space.s },
  timer: { flexDirection: 'row', alignItems: 'center', gap: space.m - 4, marginTop: space.l, backgroundColor: color.raised, borderRadius: radius.card, paddingLeft: space.m, paddingVertical: space.xs },
  timerDone: { backgroundColor: color.accentTint },
  timerBtn: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.s },
  tabular: { fontVariant: ['tabular-nums'] },
});
