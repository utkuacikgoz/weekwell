import { DINNER_RECIPES } from '@weekwell/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Layout';
import { MealImage } from '../../components/MealImage';
import { Text } from '../../components/Text';
import { useStore } from '../../state/store';
import { color, radius, space } from '../../theme/tokens';

const SHOWCASE = ['d_sheet_pan_salmon', 'd_chicken_rice_bowls', 'd_tofu_chickpea_curry'];

export default function Welcome() {
  const { analytics } = useStore();
  const { width } = useWindowDimensions();
  const { src } = useLocalSearchParams<{ src?: string }>();
  useEffect(() => {
    const source = src === 'tiktok' || src === 'friend' || src === 'direct' ? src : 'unknown';
    analytics?.track('onboarding_started', { source });
  }, [analytics, src]);
  const tile = Math.floor((Math.min(width, 560) - 2 * (space.m + 4) - 2 * space.s) / 3);
  const recipes = SHOWCASE.map((id) => DINNER_RECIPES.find((r) => r.id === id)).filter((r) => !!r);

  return (
    <Screen footer={<Button label="Get started" onPress={() => router.push('/onboarding/store')} testID="start" />}>
      <View style={styles.plates}>
        {recipes.map((r) => (
          <MealImage key={r.id} recipeId={r.id} ingredientIds={r.perServing.map((p) => p.ingredientId)} width={tile} radius={radius.card} />
        ))}
      </View>
      <Text variant="display" accessibilityRole="header" style={{ marginTop: space.xl }}>
        Plan my five dinners.
      </Text>
      <Text style={{ marginTop: space.m }}>
        Pick your store, budget, and time. Get five weeknight dinners, two lunch preps, and one grocery list.
      </Text>
      <View style={styles.list}>
        {[
          ['5 dinners', 'Monday to Friday, quickest at the end of the week'],
          ['2 lunch preps', 'Cook twice, pack lunches for the workweek'],
          ['1 grocery list', 'Grouped by aisle, with estimated prices'],
        ].map(([title, detail]) => (
          <View key={title} style={styles.item} accessible accessibilityLabel={`${title}. ${detail}`}>
            <View style={styles.tick}>
              <Icon name="check" size={16} color={color.accent} strokeWidth={2.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{title}</Text>
              <Text variant="meta" tone="muted">{detail}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text variant="meta" tone="muted" style={{ marginTop: space.l }}>
        Takes about a minute. You can change anything later.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  plates: { flexDirection: 'row', gap: space.s, marginTop: space.xl },
  list: { marginTop: space.l, gap: space.m },
  item: { flexDirection: 'row', gap: space.m - 4, alignItems: 'flex-start' },
  tick: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.accentTint, alignItems: 'center', justifyContent: 'center' },
});
