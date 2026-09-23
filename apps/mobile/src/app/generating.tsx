import { RETAILER_LABEL } from '@weekwell/domain';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Screen } from '../components/Layout';
import { Text } from '../components/Text';
import { timeCopy } from '../copy';
import { useStore } from '../state/store';
import { color, space } from '../theme/tokens';

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
} as const;

export default function Generating() {
  const { data, generate, generation } = useStore();
  const prefs = data.draft;
  const started = useRef(false);
  const [done, setDone] = useState(false);

  const run = useCallback(async () => {
    const ok = await generate();
    if (ok) {
      setDone(true);
      router.replace('/week');
    }
  }, [generate]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

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
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'waiting';
        return (
          <View key={label} style={styles.step} accessible accessibilityLabel={`${label}. ${state === 'done' ? 'Done' : state === 'active' ? 'In progress' : 'Waiting'}`}>
            <View style={styles.marker}>
              {state === 'done' ? <Text tone="accent" variant="bodyStrong">✓</Text> : state === 'active' ? <ActivityIndicator color={color.ink} /> : <View style={styles.dot} />}
            </View>
            <Text tone={state === 'waiting' ? 'muted' : 'ink'} variant={state === 'active' ? 'bodyStrong' : 'body'} style={{ flex: 1 }}>
              {label}
            </Text>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: space.xxl, paddingBottom: space.l },
  step: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: 1, borderBottomColor: color.divider },
  marker: { width: 32, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.control },
});
