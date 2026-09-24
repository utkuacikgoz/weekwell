import { RECIPES } from '@weekwell/domain';
import { Image, View } from 'react-native';
import { MEAL_PHOTOS } from '../photos/mealPhotos';
import { color } from '../theme/tokens';
import { MealArt } from './MealArt';

/**
 * Meal imagery (D-038: editorial photography). Photos are used only once every
 * recipe has one; until then every screen keeps the illustrated plates, so a
 * release never mixes the two styles. Each photo is a 4:3 master, cropped
 * (cover, centred) to whatever frame the screen asks for.
 */
export const PHOTOS_COMPLETE = RECIPES.every((r) => r.id in MEAL_PHOTOS);

export function MealImage({ recipeId, ingredientIds, width, height = width, radius = 0 }: { recipeId: string; ingredientIds: readonly string[]; width: number; height?: number; radius?: number }) {
  const photo = PHOTOS_COMPLETE ? MEAL_PHOTOS[recipeId] : undefined;
  if (photo === undefined) return <MealArt recipeId={recipeId} ingredientIds={ingredientIds} width={width} height={height} radius={radius} />;
  return (
    <View style={{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: color.placeholder }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Image source={photo} style={{ width, height }} resizeMode="cover" accessibilityIgnoresInvertColors testID={`meal-photo-${recipeId}`} />
    </View>
  );
}
