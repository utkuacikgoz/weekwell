import { DAYS, DAY_LABEL, RETAILER_LABEL } from '@weekwell/domain';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Screen } from '../components/Layout';
import { Text } from '../components/Text';
import { BANDS } from '../components/WeekParts';
import { useReducedMotion } from '../services/motion';
import { timeCopy } from '../copy';
import { useStore } from '../state/store';
import { color, radius, space } from '../theme/tokens';

const FAILURE_COPY = {
  invalid_output: {
    title: 'We couldn’t build a plan that passed our checks',
    body: 'Nothing was saved and your choices are unchanged. Try again, or change a choice.',
  },
  timeout: {
    title: 'Building your week took too long',
    body: 'Check your connection and try again. Your choices are saved.',
  },
  rate_limited: {
    title: 'Too many plans in a short time',
    body: 'Wait a few minutes, then try again. Your current plan is still available.',
  },
  provider_error: {
    title: 'Something went wrong on our side',
    body: 'Your choices are saved. Try again in a moment.',
  },
  unauthorized: {
    title: 'Please sign in again',
    body: 'Your session ended. Your choices are saved.',
  },
  subscription_required: {
    title: 'Your free week has ended',
    body: 'Your last plan is still available. Start a subscription to plan a new week.',
  },
} as const;

export default function Generating() {
  const { data, generate, generation } = useStore();
  const prefs = data.draft;
  const started = useRef(false);
  const reduced = useReducedMotion();
  const [done, setDone] = useState(false);
  // D-040 GN3: once the plan exists, its dinners fill in one at a time before the week opens.
  const [shown, setShown] = useState(0);

  const run = useCallback(async () => {
    setShown(0);
    const ok = await generate();
    if (ok) setDone(true);
  }, [generate]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  const dinners = done ? (data.plan?.dinners ?? []) : [];
  useEffect(() => {
    if (!done) return;
    if (shown < dinners.length && !reduced) {
      const t = setTimeout(() => setShown((n) => n + 1), 280);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => router.replace('/week'), reduced ? 400 : 600);
    return () => clearTimeout(t);
  }, [done, shown, dinners.length, reduced]);
  const visible = reduced ? dinners.length : shown;

  const store = prefs.retailer ? RETAILER_LABEL[prefs.retailer] : 'your store';
  const steps = [
    `Choosing 5 dinners and 2 lunch preps that fit ${timeCopy(prefs.maxMinutes).label.toLowerCase()}`,
    prefs.exclusions.length ? 'Checking every ingredient against what you leave out' : 'Checking ingredients and quantities',
    'Combining everything into one grocery list',
    `Estimating prices at ${store}`,
  ];
  const current = generation.status === 'running' ? (generation.step >= 2 ? 3 : 0) : done ? steps.length : 0;

  if (generation.status === 'failed') {
    const code = generation.code;
    const isConflict = code === 'exclusion_conflict';
    const copy = code === 'exclusion_conflict' ? null : FAILURE_COPY[code];
    return (
      <Screen
        footer={
          <>
            {!isConflict ? <Button label="Try again" onPress={() => void run()} testID="retry" /> : null}
            <Button label="Change my choices" kind={isConflict ? 'primary' : 'secondary'} onPress={() => router.replace('/onboarding/review')} testID="edit-choices" />
          </>
        }
      >
        <View style={styles.head}>
          <Text variant="title" accessibilityRole="header">
            {isConflict ? 'Your week needs a change' : 'Your week isn’t ready'}
          </Text>
        </View>
        <Banner tone="warning" title={isConflict ? 'Not enough meals for a full week' : copy!.title} testID="generation-error">
          <Text>{isConflict ? generation.message : copy!.body}</Text>
          {generation.suggestions?.map((s) => (
            <Text key={s}>• {s}</Text>
          ))}
        </Banner>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.head} accessibilityLiveRegion="polite">
        <Text variant="title" accessibilityRole="header">
          Building your week
        </Text>
        <Text tone="muted" style={{ marginTop: space.s }}>
          This usually takes a few seconds.
        </Text>
      </View>
      <Text variant="bodyStrong" style={{ marginBottom: space.m }} testID="generating-step">
        {done ? `Your ${visible === dinners.length ? '' : 'first '}dinners are ready` : `${steps[Math.min(current, steps.length - 1)]}…`}
      </Text>
      {DAYS.slice(0, 5).map((day, i) => {
        const meal = i < visible ? dinners[i] : undefined;
        return meal ? (
          <View key={day} style={[styles.slot, { backgroundColor: BANDS[i % BANDS.length] }]} accessible accessibilityLabel={`${DAY_LABEL[day]}: ${meal.name}`} testID={`generated-${day}`}>
            <Text variant="caption" style={styles.onBand}>{DAY_LABEL[day]}</Text>
            <Text variant="dish" style={styles.onBand}>{meal.name}</Text>
          </View>
        ) : (
          <View key={day} style={[styles.slot, styles.empty]} accessible accessibilityLabel={`${DAY_LABEL[day]}: waiting`}>
            <Text variant="caption" tone="muted">{DAY_LABEL[day]}</Text>
            <View style={styles.skel} />
          </View>
        );
      })}
      {!done ? (
        <View style={{ marginTop: space.m, alignItems: 'flex-start' }}>
          <ActivityIndicator color={color.accent} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: space.xxl, paddingBottom: space.l },
  slot: { minHeight: 72, justifyContent: 'center', gap: 2, paddingVertical: space.s, paddingHorizontal: space.m + 4, marginHorizontal: -(space.m + 4) },
  empty: { borderBottomWidth: 1, borderBottomColor: color.divider },
  onBand: { color: '#FFFFFF' },
  skel: { height: 14, width: '55%', borderRadius: radius.thumb, backgroundColor: color.placeholder, marginTop: space.xs },
});
