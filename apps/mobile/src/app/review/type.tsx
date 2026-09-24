/**
 * Review-only type specimen: the longest dish names in the catalogue, plus a
 * deliberately longer one, in the real components. Hidden unless the URL has
 * ?review=1 (web preview). e2e/footer.spec.ts checks it at 320px and 150%.
 */
import { DINNER_RECIPES, placeDinner, type Meal, type UserPreferences } from '@weekwell/domain';
import { Redirect } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';
import { Screen } from '../../components/Layout';
import { Text } from '../../components/Text';
import { TonightCard, WeekRow } from '../../components/WeekParts';
import { space } from '../../theme/tokens';

const PREFS: UserPreferences = { retailer: 'trader_joes', weeklyBudget: 80, proteinGoal: 'high_protein', maxMinutes: 30, householdSize: 1, exclusions: [] };
const STRESS_NAME = 'Slow-roasted lemon and herb chicken thighs with crispy smashed potatoes and garlicky green beans';

export default function TypeSpecimen() {
  const { width } = useWindowDimensions();
  const allowed = Platform.OS === 'web' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('review') === '1';
  if (!allowed) return <Redirect href="/" />;
  const longest = [...DINNER_RECIPES].sort((a, b) => b.name.length - a.name.length)[0]!;
  const meal = placeDinner(longest, 'wed', PREFS);
  const stress: Meal = { ...meal, id: 'dinner_thu', day: 'thu', name: STRESS_NAME };
  const cardWidth = Math.min(width, 560) - 2 * (space.m + 4);
  return (
    <Screen testID="type-specimen">
      <Text variant="title" accessibilityRole="header" style={{ marginTop: space.m }} testID="specimen-title">
        {longest.name}
      </Text>
      <Text variant="meta" tone="muted" style={{ marginBottom: space.m }}>
        Longest catalogue name ({longest.name.length} characters), then a {STRESS_NAME.length}-character stress name.
      </Text>
      <TonightCard meal={meal} label="Tonight · Wednesday" width={cardWidth} onPress={() => undefined} />
      <TonightCard meal={stress} label="Tonight · Thursday" width={cardWidth} onPress={() => undefined} />
      <WeekRow meal={meal} onPress={() => undefined} />
      <WeekRow meal={stress} onPress={() => undefined} />
    </Screen>
  );
}
