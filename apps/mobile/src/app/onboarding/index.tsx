import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { Divider, Screen } from '../../components/Layout';
import { Text } from '../../components/Text';
import { useStore } from '../../state/store';
import { color, space } from '../../theme/tokens';

const RESULT = [
  ['5 dinners', 'Monday to Friday, in the order you’ll cook them.'],
  ['2 lunch preps', 'Cook twice, pack lunches for the workweek.'],
  ['1 grocery list', 'Grouped by store section, with estimated prices.'],
] as const;

export default function Welcome() {
  const { analytics } = useStore();
  const { src } = useLocalSearchParams<{ src?: string }>();
  useEffect(() => {
    const source = src === 'tiktok' || src === 'friend' || src === 'direct' ? src : 'unknown';
    analytics?.track('onboarding_started', { source });
  }, [analytics, src]);

  return (
    <Screen footer={<Button label="Start" onPress={() => router.push('/onboarding/store')} testID="start" />}>
      <View style={styles.hero}>
        <Text variant="label" tone="muted">WEEKWELL</Text>
        <Text variant="display" accessibilityRole="header" style={{ marginTop: space.m }}>
          Plan my five dinners.
        </Text>
        <Text style={{ marginTop: space.m }}>
          Tell us your store, budget, and cooking time. You’ll get five weeknight dinners, practical work lunches, and one grocery list.
        </Text>
      </View>
      <Divider />
      {RESULT.map(([title, detail]) => (
        <View key={title} style={styles.item} accessible accessibilityLabel={`${title}. ${detail}`}>
          <Text variant="heading">{title}</Text>
          <Text tone="muted">{detail}</Text>
        </View>
      ))}
      <Text variant="meta" tone="muted" style={{ marginTop: space.l }}>
        Takes about a minute. You can change any answer later.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: space.xxl, paddingBottom: space.l },
  item: { paddingVertical: space.m, borderBottomWidth: 1, borderBottomColor: color.divider },
});
