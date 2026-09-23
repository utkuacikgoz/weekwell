/**
 * Fixture ingredient catalog.
 *
 * `proteinPerUnit` values are typical averages (grams of protein per gram,
 * millilitre, or item). Protein totals derived from them are always labelled
 * as estimates. Allergen tags are conservative, but the UI must still tell
 * people to read package labels.
 */
import { IngredientSchema, type Ingredient } from '../schemas';

const raw: Array<Omit<Ingredient, 'staple' | 'aliases'> & Partial<Pick<Ingredient, 'staple' | 'aliases'>>> = [
  // Meat & seafood
  { id: 'chicken_breast', name: 'Chicken breast', section: 'meat_seafood', unit: 'g', allergens: [], proteinPerUnit: 0.23, aliases: ['chicken'] },
  { id: 'chicken_thigh', name: 'Chicken thighs', section: 'meat_seafood', unit: 'g', allergens: [], proteinPerUnit: 0.19, aliases: ['chicken'] },
  { id: 'ground_turkey', name: 'Ground turkey (93% lean)', section: 'meat_seafood', unit: 'g', allergens: [], proteinPerUnit: 0.19, aliases: ['turkey'] },
  { id: 'ground_beef', name: 'Ground beef (93% lean)', section: 'meat_seafood', unit: 'g', allergens: [], proteinPerUnit: 0.21, aliases: ['beef', 'red meat'] },
  { id: 'sirloin', name: 'Sirloin steak', section: 'meat_seafood', unit: 'g', allergens: [], proteinPerUnit: 0.22, aliases: ['beef', 'steak', 'red meat'] },
  { id: 'salmon', name: 'Salmon fillet', section: 'meat_seafood', unit: 'g', allergens: ['fish'], proteinPerUnit: 0.2, aliases: ['fish'] },
  { id: 'shrimp', name: 'Shrimp, peeled', section: 'meat_seafood', unit: 'g', allergens: ['shellfish'], proteinPerUnit: 0.2, aliases: ['prawn', 'prawns', 'seafood'] },
  { id: 'chicken_sausage', name: 'Chicken sausage links', section: 'meat_seafood', unit: 'each', allergens: [], proteinPerUnit: 13, aliases: ['chicken', 'sausage', 'pork'] },

  // Refrigerated
  { id: 'deli_turkey', name: 'Sliced turkey breast', section: 'refrigerated', unit: 'g', allergens: [], proteinPerUnit: 0.17, aliases: ['turkey', 'deli meat'] },
  { id: 'tofu', name: 'Extra-firm tofu', section: 'refrigerated', unit: 'g', allergens: ['soy'], proteinPerUnit: 0.1 },
  { id: 'hummus', name: 'Hummus', section: 'refrigerated', unit: 'g', allergens: ['sesame'], proteinPerUnit: 0.08, aliases: ['chickpea', 'chickpeas', 'garbanzo', 'tahini'] },
  { id: 'salsa', name: 'Salsa', section: 'refrigerated', unit: 'ml', allergens: [], proteinPerUnit: 0.01, aliases: ['tomato', 'tomatoes'] },

  // Dairy & eggs
  { id: 'eggs', name: 'Eggs', section: 'dairy_eggs', unit: 'each', allergens: ['egg'], proteinPerUnit: 6.3 },
  { id: 'greek_yogurt', name: 'Plain Greek yogurt (nonfat)', section: 'dairy_eggs', unit: 'g', allergens: ['dairy'], proteinPerUnit: 0.1, aliases: ['yogurt', 'milk'] },
  { id: 'feta', name: 'Feta', section: 'dairy_eggs', unit: 'g', allergens: ['dairy'], proteinPerUnit: 0.14, aliases: ['cheese'] },
  { id: 'parmesan', name: 'Parmesan', section: 'dairy_eggs', unit: 'g', allergens: ['dairy'], proteinPerUnit: 0.36, aliases: ['cheese'] },

  // Bakery
  { id: 'flour_tortillas', name: 'Flour tortillas', section: 'bakery', unit: 'each', allergens: ['gluten'], proteinPerUnit: 4, aliases: ['wheat', 'tortilla', 'tortillas'] },
  { id: 'corn_tortillas', name: 'Corn tortillas', section: 'bakery', unit: 'each', allergens: [], proteinPerUnit: 1.4, aliases: ['corn', 'tortilla', 'tortillas'] },
  { id: 'whole_wheat_pita', name: 'Whole wheat pita', section: 'bakery', unit: 'each', allergens: ['gluten'], proteinPerUnit: 6, aliases: ['wheat', 'bread'] },

  // Pantry
  { id: 'jasmine_rice', name: 'Jasmine rice (dry)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.07 },
  { id: 'quinoa', name: 'Quinoa (dry)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.14 },
  { id: 'pasta', name: 'Pasta (dry)', section: 'pantry', unit: 'g', allergens: ['gluten'], proteinPerUnit: 0.13, aliases: ['wheat'] },
  { id: 'black_beans', name: 'Black beans (canned)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.07, aliases: ['beans', 'legumes'] },
  { id: 'cannellini', name: 'White beans (canned)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.07, aliases: ['beans', 'legumes'] },
  { id: 'chickpeas', name: 'Chickpeas (canned)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.07, aliases: ['garbanzo', 'beans', 'legumes'] },
  { id: 'canned_tuna', name: 'Tuna in water (canned)', section: 'pantry', unit: 'g', allergens: ['fish'], proteinPerUnit: 0.25, aliases: ['fish'] },
  { id: 'marinara', name: 'Marinara sauce', section: 'pantry', unit: 'ml', allergens: [], proteinPerUnit: 0.015, aliases: ['tomato', 'tomatoes'] },
  { id: 'diced_tomatoes', name: 'Diced tomatoes (canned)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.008, aliases: ['tomato', 'tomatoes'] },
  { id: 'coconut_milk', name: 'Coconut milk (canned)', section: 'pantry', unit: 'ml', allergens: [], proteinPerUnit: 0.02, aliases: ['coconut'] },
  { id: 'red_curry_paste', name: 'Red curry paste', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.02, aliases: ['curry'] },
  { id: 'soy_sauce', name: 'Soy sauce', section: 'pantry', unit: 'ml', allergens: ['soy', 'gluten'], proteinPerUnit: 0.08, aliases: ['wheat'] },
  { id: 'coconut_aminos', name: 'Coconut aminos', section: 'pantry', unit: 'ml', allergens: [], proteinPerUnit: 0, aliases: ['coconut'] },

  // Frozen
  { id: 'frozen_brown_rice', name: 'Frozen brown rice (cooked)', section: 'frozen', unit: 'g', allergens: [], proteinPerUnit: 0.026, aliases: ['rice'] },
  { id: 'frozen_edamame', name: 'Shelled edamame (frozen)', section: 'frozen', unit: 'g', allergens: ['soy'], proteinPerUnit: 0.11 },
  { id: 'frozen_stirfry_veg', name: 'Stir-fry vegetables (frozen)', section: 'frozen', unit: 'g', allergens: [], proteinPerUnit: 0.02 },

  // Produce
  { id: 'broccoli', name: 'Broccoli florets', section: 'produce', unit: 'g', allergens: [], proteinPerUnit: 0.028 },
  { id: 'green_beans', name: 'Green beans', section: 'produce', unit: 'g', allergens: [], proteinPerUnit: 0.018, aliases: ['beans'] },
  { id: 'spinach', name: 'Baby spinach', section: 'produce', unit: 'g', allergens: [], proteinPerUnit: 0.029 },
  { id: 'bell_pepper', name: 'Bell peppers', section: 'produce', unit: 'each', allergens: [], proteinPerUnit: 1.2, aliases: ['pepper', 'peppers', 'nightshade'] },
  { id: 'onion', name: 'Yellow onions', section: 'produce', unit: 'each', allergens: [], proteinPerUnit: 1.3, aliases: ['onions'] },
  { id: 'garlic', name: 'Garlic cloves', section: 'produce', unit: 'each', allergens: [], proteinPerUnit: 0.2 },
  { id: 'lemon', name: 'Lemons', section: 'produce', unit: 'each', allergens: [], proteinPerUnit: 0.4, aliases: ['citrus'] },
  { id: 'lime', name: 'Limes', section: 'produce', unit: 'each', allergens: [], proteinPerUnit: 0.2, aliases: ['citrus'] },
  { id: 'cucumber', name: 'Cucumbers', section: 'produce', unit: 'each', allergens: [], proteinPerUnit: 2 },
  { id: 'cherry_tomatoes', name: 'Cherry tomatoes', section: 'produce', unit: 'g', allergens: [], proteinPerUnit: 0.009, aliases: ['tomato', 'tomatoes', 'nightshade'] },
  { id: 'baby_potatoes', name: 'Baby potatoes', section: 'produce', unit: 'g', allergens: [], proteinPerUnit: 0.02, aliases: ['potato', 'potatoes', 'nightshade'] },
  { id: 'sweet_potato', name: 'Sweet potatoes', section: 'produce', unit: 'g', allergens: [], proteinPerUnit: 0.016, aliases: ['sweet potatoes'] },
  { id: 'carrots', name: 'Shredded carrots', section: 'produce', unit: 'g', allergens: [], proteinPerUnit: 0.009, aliases: ['carrot'] },
  { id: 'butter_lettuce', name: 'Butter lettuce', section: 'produce', unit: 'each', allergens: [], proteinPerUnit: 1.5, aliases: ['lettuce'] },

  // Staples: listed, never priced (D-021)
  { id: 'olive_oil', name: 'Olive oil', section: 'pantry', unit: 'ml', allergens: [], proteinPerUnit: 0, staple: true, aliases: ['oil'] },
  { id: 'salt_pepper', name: 'Salt and pepper', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0, staple: true },
  { id: 'chili_powder', name: 'Chili powder', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.13, staple: true, aliases: ['chili', 'spice'] },
];

export const INGREDIENTS: readonly Ingredient[] = raw.map((i) => IngredientSchema.parse(i));

export const INGREDIENTS_BY_ID: ReadonlyMap<string, Ingredient> = new Map(INGREDIENTS.map((i) => [i.id, i]));

export function getIngredient(id: string): Ingredient {
  const ingredient = INGREDIENTS_BY_ID.get(id);
  if (!ingredient) throw new Error(`Unknown ingredient: ${id}`);
  return ingredient;
}
