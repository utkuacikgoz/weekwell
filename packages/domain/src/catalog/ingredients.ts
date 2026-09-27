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
  { id: 'chicken_breast', name: 'Chicken breast', section: 'meat_seafood', unit: 'g', allergens: [], proteinPerUnit: 0.23, aliases: ['chicken', 'poultry', 'meat'] },
  { id: 'chicken_thigh', name: 'Chicken thighs', section: 'meat_seafood', unit: 'g', allergens: [], proteinPerUnit: 0.19, aliases: ['chicken', 'poultry', 'meat'] },
  { id: 'ground_turkey', name: 'Ground turkey (93% lean)', section: 'meat_seafood', unit: 'g', allergens: [], proteinPerUnit: 0.19, aliases: ['turkey', 'poultry', 'meat'] },
  { id: 'ground_beef', name: 'Ground beef (93% lean)', section: 'meat_seafood', unit: 'g', allergens: [], proteinPerUnit: 0.21, aliases: ['beef', 'red meat', 'meat'] },
  { id: 'sirloin', name: 'Sirloin steak', section: 'meat_seafood', unit: 'g', allergens: [], proteinPerUnit: 0.22, aliases: ['beef', 'steak', 'red meat', 'meat'] },
  { id: 'salmon', name: 'Salmon fillet', section: 'meat_seafood', unit: 'g', allergens: ['fish'], proteinPerUnit: 0.2, aliases: ['fish', 'seafood'] },
  { id: 'shrimp', name: 'Shrimp, peeled', section: 'meat_seafood', unit: 'g', allergens: ['shellfish'], proteinPerUnit: 0.2, aliases: ['prawn', 'prawns', 'seafood'] },
  { id: 'chicken_sausage', name: 'Chicken sausage links', section: 'meat_seafood', unit: 'each', allergens: [], proteinPerUnit: 13, aliases: ['chicken', 'sausage', 'pork', 'poultry', 'meat'] },
  { id: 'pork_tenderloin', name: 'Pork tenderloin', section: 'meat_seafood', unit: 'g', allergens: [], proteinPerUnit: 0.21, aliases: ['pork', 'meat'] },
  { id: 'pork_chops', name: 'Boneless pork chops', section: 'meat_seafood', unit: 'g', allergens: [], proteinPerUnit: 0.22, aliases: ['pork', 'meat'] },
  { id: 'cod', name: 'Cod fillets', section: 'meat_seafood', unit: 'g', allergens: ['fish'], proteinPerUnit: 0.18, aliases: ['fish', 'white fish', 'seafood'] },

  // Refrigerated
  { id: 'deli_turkey', name: 'Sliced turkey breast', section: 'refrigerated', unit: 'g', allergens: [], proteinPerUnit: 0.17, aliases: ['turkey', 'deli meat', 'poultry', 'meat'] },
  { id: 'tofu', name: 'Extra-firm tofu', section: 'refrigerated', unit: 'g', allergens: ['soy'], proteinPerUnit: 0.1 },
  { id: 'hummus', name: 'Hummus', section: 'refrigerated', unit: 'g', allergens: ['sesame'], proteinPerUnit: 0.08, aliases: ['chickpea', 'chickpeas', 'garbanzo', 'tahini'] },
  { id: 'salsa', name: 'Salsa', section: 'refrigerated', unit: 'ml', allergens: [], proteinPerUnit: 0.01, aliases: ['tomato', 'tomatoes'] },
  { id: 'tempeh', name: 'Tempeh', section: 'refrigerated', unit: 'g', allergens: ['soy'], proteinPerUnit: 0.19 },
  { id: 'pesto', name: 'Basil pesto', section: 'refrigerated', unit: 'ml', allergens: ['dairy', 'tree_nuts'], proteinPerUnit: 0.05, aliases: ['basil', 'cheese', 'pine nuts'] },

  // Dairy & eggs
  { id: 'eggs', name: 'Eggs', section: 'dairy_eggs', unit: 'each', allergens: ['egg'], proteinPerUnit: 6.3 },
  { id: 'greek_yogurt', name: 'Plain Greek yogurt (nonfat)', section: 'dairy_eggs', unit: 'g', allergens: ['dairy'], proteinPerUnit: 0.1, aliases: ['yogurt', 'milk'] },
  { id: 'feta', name: 'Feta', section: 'dairy_eggs', unit: 'g', allergens: ['dairy'], proteinPerUnit: 0.14, aliases: ['cheese'] },
  { id: 'parmesan', name: 'Parmesan', section: 'dairy_eggs', unit: 'g', allergens: ['dairy'], proteinPerUnit: 0.36, aliases: ['cheese'] },
  { id: 'mozzarella', name: 'Shredded mozzarella (part-skim)', section: 'dairy_eggs', unit: 'g', allergens: ['dairy'], proteinPerUnit: 0.24, aliases: ['cheese'] },
  { id: 'cheddar', name: 'Shredded cheddar', section: 'dairy_eggs', unit: 'g', allergens: ['dairy'], proteinPerUnit: 0.25, aliases: ['cheese'] },

  // Bakery
  { id: 'flour_tortillas', name: 'Flour tortillas', section: 'bakery', unit: 'each', allergens: ['gluten'], proteinPerUnit: 4, aliases: ['wheat', 'tortilla', 'tortillas'] },
  { id: 'corn_tortillas', name: 'Corn tortillas', section: 'bakery', unit: 'each', allergens: [], proteinPerUnit: 1.4, aliases: ['corn', 'tortilla', 'tortillas'] },
  { id: 'whole_wheat_pita', name: 'Whole wheat pita', section: 'bakery', unit: 'each', allergens: ['gluten'], proteinPerUnit: 6, aliases: ['wheat', 'bread'] },
  { id: 'burger_buns', name: 'Whole wheat burger buns', section: 'bakery', unit: 'each', allergens: ['gluten', 'soy'], proteinPerUnit: 6, aliases: ['wheat', 'bread', 'bun', 'buns'] },
  { id: 'whole_wheat_bread', name: 'Whole wheat bread (slices)', section: 'bakery', unit: 'each', allergens: ['gluten', 'soy'], proteinPerUnit: 4, aliases: ['wheat', 'bread'] },
  { id: 'naan', name: 'Naan', section: 'bakery', unit: 'each', allergens: ['gluten', 'dairy'], proteinPerUnit: 8, aliases: ['wheat', 'bread', 'flatbread'] },

  // Pantry
  { id: 'jasmine_rice', name: 'Jasmine rice (dry)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.07 },
  { id: 'quinoa', name: 'Quinoa (dry)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.14 },
  { id: 'pasta', name: 'Pasta (dry)', section: 'pantry', unit: 'g', allergens: ['gluten'], proteinPerUnit: 0.13, aliases: ['wheat'] },
  { id: 'black_beans', name: 'Black beans (canned)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.07, aliases: ['beans', 'legumes'] },
  { id: 'cannellini', name: 'White beans (canned)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.07, aliases: ['beans', 'legumes'] },
  { id: 'chickpeas', name: 'Chickpeas (canned)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.07, aliases: ['garbanzo', 'beans', 'legumes'] },
  { id: 'canned_tuna', name: 'Tuna in water (canned)', section: 'pantry', unit: 'g', allergens: ['fish'], proteinPerUnit: 0.25, aliases: ['fish', 'seafood'] },
  { id: 'marinara', name: 'Marinara sauce', section: 'pantry', unit: 'ml', allergens: [], proteinPerUnit: 0.015, aliases: ['tomato', 'tomatoes'] },
  { id: 'diced_tomatoes', name: 'Diced tomatoes (canned)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.008, aliases: ['tomato', 'tomatoes'] },
  { id: 'coconut_milk', name: 'Coconut milk (canned)', section: 'pantry', unit: 'ml', allergens: [], proteinPerUnit: 0.02, aliases: ['coconut'] },
  { id: 'red_curry_paste', name: 'Red curry paste', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.02, aliases: ['curry'] },
  { id: 'soy_sauce', name: 'Soy sauce', section: 'pantry', unit: 'ml', allergens: ['soy', 'gluten'], proteinPerUnit: 0.08, aliases: ['wheat'] },
  { id: 'coconut_aminos', name: 'Coconut aminos', section: 'pantry', unit: 'ml', allergens: [], proteinPerUnit: 0, aliases: ['coconut'] },
  { id: 'rice_noodles', name: 'Rice noodles (dry)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.06, aliases: ['noodles', 'rice'] },
  { id: 'rice_pasta', name: 'Brown rice pasta (dry)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.07, aliases: ['pasta', 'rice'] },
  { id: 'couscous', name: 'Couscous (dry)', section: 'pantry', unit: 'g', allergens: ['gluten'], proteinPerUnit: 0.13, aliases: ['wheat'] },
  { id: 'red_lentils', name: 'Red lentils (dry)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.24, aliases: ['lentils', 'legumes'] },
  { id: 'brown_lentils', name: 'Brown lentils (dry)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.25, aliases: ['lentils', 'legumes'] },
  { id: 'pinto_beans', name: 'Pinto beans (canned)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.07, aliases: ['beans', 'legumes'] },
  { id: 'kidney_beans', name: 'Kidney beans (canned)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.08, aliases: ['beans', 'legumes'] },
  { id: 'chicken_broth', name: 'Chicken broth', section: 'pantry', unit: 'ml', allergens: [], proteinPerUnit: 0.004, aliases: ['chicken', 'broth', 'stock', 'poultry', 'meat'] },
  { id: 'vegetable_broth', name: 'Vegetable broth', section: 'pantry', unit: 'ml', allergens: [], proteinPerUnit: 0.002, aliases: ['broth', 'stock'] },
  { id: 'enchilada_sauce', name: 'Red enchilada sauce', section: 'pantry', unit: 'ml', allergens: ['gluten'], proteinPerUnit: 0.005, aliases: ['wheat', 'chili'] },
  { id: 'peanut_butter', name: 'Peanut butter', section: 'pantry', unit: 'ml', allergens: ['peanuts'], proteinPerUnit: 0.25, aliases: ['peanut', 'nut', 'nuts'] },
  { id: 'cashews', name: 'Roasted cashews', section: 'pantry', unit: 'g', allergens: ['tree_nuts'], proteinPerUnit: 0.18, aliases: ['cashew', 'nut', 'nuts'] },
  { id: 'honey', name: 'Honey', section: 'pantry', unit: 'ml', allergens: [], proteinPerUnit: 0 },
  { id: 'dijon', name: 'Dijon mustard', section: 'pantry', unit: 'ml', allergens: [], proteinPerUnit: 0.04, aliases: ['mustard'] },
  { id: 'olives', name: 'Kalamata olives (pitted)', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.008, aliases: ['olive'] },

  // Frozen
  { id: 'frozen_brown_rice', name: 'Frozen brown rice (cooked)', section: 'frozen', unit: 'g', allergens: [], proteinPerUnit: 0.026, aliases: ['rice'] },
  { id: 'frozen_edamame', name: 'Shelled edamame (frozen)', section: 'frozen', unit: 'g', allergens: ['soy'], proteinPerUnit: 0.11 },
  { id: 'frozen_stirfry_veg', name: 'Stir-fry vegetables (frozen)', section: 'frozen', unit: 'g', allergens: [], proteinPerUnit: 0.02 },
  { id: 'frozen_corn', name: 'Corn (frozen)', section: 'frozen', unit: 'g', allergens: [], proteinPerUnit: 0.03, aliases: ['corn'] },
  { id: 'frozen_peas', name: 'Peas (frozen)', section: 'frozen', unit: 'g', allergens: [], proteinPerUnit: 0.05, aliases: ['peas', 'legumes'] },
  { id: 'cauliflower_rice', name: 'Cauliflower rice (frozen)', section: 'frozen', unit: 'g', allergens: [], proteinPerUnit: 0.02, aliases: ['cauliflower'] },

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
  { id: 'romaine', name: 'Romaine hearts', section: 'produce', unit: 'each', allergens: [], proteinPerUnit: 2, aliases: ['lettuce'] },
  { id: 'coleslaw_mix', name: 'Coleslaw mix (shredded cabbage)', section: 'produce', unit: 'g', allergens: [], proteinPerUnit: 0.013, aliases: ['cabbage', 'slaw'] },
  { id: 'kale', name: 'Chopped kale', section: 'produce', unit: 'g', allergens: [], proteinPerUnit: 0.029, aliases: ['greens'] },
  { id: 'zucchini', name: 'Zucchini', section: 'produce', unit: 'each', allergens: [], proteinPerUnit: 2.4, aliases: ['squash'] },
  { id: 'mushrooms', name: 'Sliced mushrooms', section: 'produce', unit: 'g', allergens: [], proteinPerUnit: 0.031, aliases: ['mushroom'] },
  { id: 'cauliflower', name: 'Cauliflower florets', section: 'produce', unit: 'g', allergens: [], proteinPerUnit: 0.019 },
  { id: 'asparagus', name: 'Asparagus', section: 'produce', unit: 'g', allergens: [], proteinPerUnit: 0.022 },
  { id: 'snap_peas', name: 'Sugar snap peas', section: 'produce', unit: 'g', allergens: [], proteinPerUnit: 0.028, aliases: ['peas'] },
  { id: 'celery', name: 'Celery stalks', section: 'produce', unit: 'each', allergens: [], proteinPerUnit: 0.3 },
  { id: 'avocado', name: 'Avocados', section: 'produce', unit: 'each', allergens: [], proteinPerUnit: 3, aliases: ['guacamole'] },
  { id: 'green_onions', name: 'Green onions', section: 'produce', unit: 'each', allergens: [], proteinPerUnit: 0.3, aliases: ['scallions', 'onions'] },
  { id: 'ginger', name: 'Fresh ginger', section: 'produce', unit: 'g', allergens: [], proteinPerUnit: 0.018 },
  { id: 'cilantro', name: 'Cilantro (bunch)', section: 'produce', unit: 'each', allergens: [], proteinPerUnit: 1, aliases: ['herbs', 'coriander'] },

  // Staples: listed, never priced (D-021)
  { id: 'olive_oil', name: 'Olive oil', section: 'pantry', unit: 'ml', allergens: [], proteinPerUnit: 0, staple: true, aliases: ['oil'] },
  { id: 'salt_pepper', name: 'Salt and pepper', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0, staple: true },
  { id: 'chili_powder', name: 'Chili powder', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.13, staple: true, aliases: ['chili', 'spice'] },
  { id: 'cumin', name: 'Ground cumin', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.18, staple: true, aliases: ['spice'] },
  { id: 'smoked_paprika', name: 'Smoked paprika', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.14, staple: true, aliases: ['spice', 'nightshade'] },
  { id: 'italian_seasoning', name: 'Italian seasoning', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.1, staple: true, aliases: ['herbs'] },
  { id: 'curry_powder', name: 'Curry powder', section: 'pantry', unit: 'g', allergens: [], proteinPerUnit: 0.14, staple: true, aliases: ['curry', 'spice'] },
  { id: 'red_wine_vinegar', name: 'Red wine vinegar', section: 'pantry', unit: 'ml', allergens: [], proteinPerUnit: 0, staple: true, aliases: ['vinegar'] },
];

export const INGREDIENTS: readonly Ingredient[] = raw.map((i) => IngredientSchema.parse(i));

export const INGREDIENTS_BY_ID: ReadonlyMap<string, Ingredient> = new Map(INGREDIENTS.map((i) => [i.id, i]));

export function getIngredient(id: string): Ingredient {
  const ingredient = INGREDIENTS_BY_ID.get(id);
  if (!ingredient) throw new Error(`Unknown ingredient: ${id}`);
  return ingredient;
}
