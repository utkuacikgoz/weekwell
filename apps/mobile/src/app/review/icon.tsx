/** Review-only: renders the app icon artwork for export (web preview with ?review=1&variant=icon|foreground|splash). */
import { Redirect } from 'expo-router';
import { Platform, View } from 'react-native';
import { MealArt } from '../../components/MealArt';

const RECIPE = { id: 'd_chicken_rice_bowls', ingredients: ['jasmine_rice', 'chicken_breast', 'broccoli'] };

export default function IconArt() {
  const q = Platform.OS === 'web' && typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  if (q?.get('review') !== '1') return <Redirect href="/" />;
  const variant = q.get('variant') ?? 'icon';
  const size = Number(q.get('size') ?? 1024);
  // Android adaptive icons and the splash keep the plate inside the central safe zone.
  const inset = variant === 'icon' ? 1 : 0.62;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', backgroundColor: variant === 'icon' ? '#EFE4CF' : 'transparent' }} testID="icon-art">
      <MealArt recipeId={RECIPE.id} ingredientIds={RECIPE.ingredients} width={Math.round(size * inset)} radius={0} tile={variant === 'icon'} />
    </View>
  );
}
