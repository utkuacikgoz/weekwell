/**
 * Review-only photo coverage (D-038): every recipe's shot brief, and its photo
 * once it's in assets/meals/, shown in the two crops the app uses (16:9 hero,
 * 1:1 thumbnail). Hidden unless ?review=1 (web preview).
 */
import { RECIPES_BY_ID } from '@weekwell/domain';
import { Redirect } from 'expo-router';
import { Image, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Screen } from '../../components/Layout';
import { Text } from '../../components/Text';
import { PHOTOS_COMPLETE } from '../../components/MealImage';
import { PHOTO_SPEC, SHOTS } from '../../photos/brief';
import { MEAL_PHOTOS } from '../../photos/mealPhotos';
import { color, radius, space } from '../../theme/tokens';

export default function PhotoCoverage() {
  const { width } = useWindowDimensions();
  const allowed = Platform.OS === 'web' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('review') === '1';
  if (!allowed) return <Redirect href="/" />;
  const col = Math.min(width, 560) - 2 * (space.m + 4);
  const have = SHOTS.filter((s) => MEAL_PHOTOS[s.recipeId] !== undefined).length;
  return (
    <Screen testID="photo-coverage">
      <Text variant="title" accessibilityRole="header" style={{ marginTop: space.m }}>Meal photos</Text>
      <Text tone="muted" style={{ marginTop: space.xs }} testID="photo-count">
        {have} of {SHOTS.length} recipes have a photo. {PHOTOS_COMPLETE ? 'The app is using photos.' : 'The app keeps the illustrated plates until all are in.'}
      </Text>
      <View style={styles.spec}>
        <Text variant="label">Style for every shot</Text>
        <Text variant="meta" tone="muted">{PHOTO_SPEC.style}</Text>
        {PHOTO_SPEC.rules.map((r) => <Text key={r} variant="meta" tone="muted">• {r}</Text>)}
      </View>
      {SHOTS.map((s) => {
        const photo = MEAL_PHOTOS[s.recipeId];
        return (
          <View key={s.recipeId} style={styles.row} testID={`shot-${s.recipeId}`}>
            <Text variant="bodyStrong">{RECIPES_BY_ID.get(s.recipeId)?.name ?? s.recipeId}</Text>
            <Text variant="caption" tone="muted">{s.recipeId}.jpg · {s.vessel}</Text>
            {photo !== undefined ? (
              <View style={styles.crops}>
                <Image source={photo} style={{ width: col, height: (col * 9) / 16, borderRadius: radius.card }} resizeMode="cover" />
                <Image source={photo} style={{ width: 60, height: 60, borderRadius: radius.thumb }} resizeMode="cover" />
              </View>
            ) : (
              <View style={[styles.slot, { width: col, height: (col * 9) / 16 }]}>
                <Text variant="label" tone="muted">No photo yet</Text>
                <Text variant="meta" tone="muted" style={{ textAlign: 'center' }}>{s.prompt}</Text>
              </View>
            )}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  spec: { marginTop: space.m, gap: space.xs, backgroundColor: color.raised, borderRadius: radius.card, padding: space.m },
  row: { marginTop: space.l, gap: space.xs },
  crops: { gap: space.s },
  slot: { borderRadius: radius.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.control, alignItems: 'center', justifyContent: 'center', gap: space.xs, padding: space.m, backgroundColor: color.placeholder },
});
