/** Review-only gallery of every meal illustration. Hidden unless the URL has ?review=1 (web preview). */
import { RECIPES } from '@weekwell/domain';
import { Redirect } from 'expo-router';
import { Platform, ScrollView, View } from 'react-native';
import { MealArt } from '../../components/MealArt';
import { Text } from '../../components/Text';
import { color, space } from '../../theme/tokens';

export default function ArtGallery() {
  const allowed = Platform.OS === 'web' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('review') === '1';
  if (!allowed) return <Redirect href="/" />;
  return (
    <ScrollView style={{ backgroundColor: color.background }} contentContainerStyle={{ padding: space.m, gap: space.m }}>
      <MealArt recipeId={RECIPES[0]!.id} ingredientIds={RECIPES[0]!.perServing.map((p) => p.ingredientId)} width={358} height={168} radius={16} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.m }}>
        {RECIPES.map((r) => (
          <View key={r.id} style={{ width: 104, gap: 4 }}>
            <MealArt recipeId={r.id} ingredientIds={r.perServing.map((p) => p.ingredientId)} width={104} />
            <Text variant="caption" tone="muted">{r.name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
