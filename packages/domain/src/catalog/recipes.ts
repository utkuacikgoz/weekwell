/**
 * Fixture recipe catalog. Amounts are per serving, in the ingredient's
 * canonical unit. Deterministic planning (planner.ts) chooses from these.
 */
import { z } from 'zod';
import { IdSchema, MealSlotSchema, ProteinGoalSchema, type MealSlot, type ProteinGoal } from '../schemas';
import { INGREDIENTS_BY_ID } from './ingredients';

export const RecipeSchema = z
  .object({
    id: IdSchema,
    name: z.string().min(1).max(90),
    slot: MealSlotSchema,
    goals: z.array(ProteinGoalSchema).min(1),
    /** True for recipes designed to be cooked in bulk (batch-cooking preference). */
    batch: z.boolean(),
    activeMinutes: z.number().int().positive(),
    totalMinutes: z.number().int().positive(),
    perServing: z.array(z.object({ ingredientId: IdSchema, amount: z.number().positive() }).strict()).min(1),
    steps: z.array(z.string().min(1).max(400)).min(1),
  })
  .strict()
  .superRefine((r, ctx) => {
    for (const p of r.perServing) {
      if (!INGREDIENTS_BY_ID.has(p.ingredientId)) {
        ctx.addIssue({ code: 'custom', message: `unknown ingredient ${p.ingredientId} in ${r.id}` });
      }
    }
  });
export type Recipe = z.infer<typeof RecipeSchema>;

type RawRecipe = {
  id: string;
  name: string;
  slot: MealSlot;
  goals: ProteinGoal[];
  batch?: boolean;
  activeMinutes: number;
  totalMinutes: number;
  perServing: Record<string, number>;
  steps: string[];
};

const dinners: RawRecipe[] = [
  {
    id: 'd_chicken_rice_bowls',
    name: 'Garlic chicken, rice, and broccoli bowls',
    slot: 'dinner',
    goals: ['high_protein', 'low_effort'],
    activeMinutes: 15,
    totalMinutes: 25,
    perServing: { chicken_breast: 170, jasmine_rice: 75, broccoli: 150, soy_sauce: 15, garlic: 1, olive_oil: 10 },
    steps: [
      'Start the rice with 2× its volume of water. Cover and simmer 15 minutes.',
      'Cut the chicken into bite-size pieces. Season with salt and pepper.',
      'Brown the chicken in oil over medium-high heat, 6–7 minutes, until no pink remains.',
      'Add broccoli, minced garlic, soy sauce, and a splash of water. Cover 3 minutes.',
      'Serve over rice.',
    ],
  },
  {
    id: 'd_turkey_taco_skillet',
    name: 'Turkey and black bean taco skillet',
    slot: 'dinner',
    goals: ['high_protein', 'low_effort', 'family_friendly'],
    activeMinutes: 15,
    totalMinutes: 20,
    perServing: { ground_turkey: 150, black_beans: 120, bell_pepper: 0.5, onion: 0.25, salsa: 60, corn_tortillas: 2, chili_powder: 3 },
    steps: [
      'Dice the onion and pepper. Soften in a large skillet over medium heat, 4 minutes.',
      'Add turkey and chili powder. Cook, breaking it up, until browned, about 7 minutes.',
      'Stir in drained beans and salsa. Simmer 3 minutes.',
      'Warm the tortillas in a dry pan and serve with the filling.',
    ],
  },
  {
    id: 'd_sheet_pan_salmon',
    name: 'Sheet-pan salmon with potatoes and green beans',
    slot: 'dinner',
    goals: ['high_protein', 'low_effort'],
    activeMinutes: 10,
    totalMinutes: 30,
    perServing: { salmon: 170, baby_potatoes: 200, green_beans: 120, lemon: 0.5, olive_oil: 10, salt_pepper: 2 },
    steps: [
      'Heat the oven to 425°F. Halve the potatoes, toss with half the oil, salt, and pepper.',
      'Roast potatoes 12 minutes.',
      'Add salmon and green beans to the pan. Drizzle with the remaining oil.',
      'Roast 12–14 minutes, until salmon flakes easily. Squeeze lemon over everything.',
    ],
  },
  {
    id: 'd_shrimp_stir_fry',
    name: 'Shrimp and vegetable stir-fry',
    slot: 'dinner',
    goals: ['high_protein', 'low_effort'],
    activeMinutes: 10,
    totalMinutes: 15,
    perServing: { shrimp: 170, frozen_stirfry_veg: 200, frozen_brown_rice: 150, soy_sauce: 15, garlic: 1, olive_oil: 10 },
    steps: [
      'Microwave the rice following the package directions.',
      'Stir-fry the frozen vegetables in oil over high heat, 5 minutes.',
      'Add shrimp and minced garlic. Cook until shrimp turn pink, 3–4 minutes.',
      'Add soy sauce, toss, and serve over rice.',
    ],
  },
  {
    id: 'd_beef_broccoli',
    name: 'Beef and broccoli over rice',
    slot: 'dinner',
    goals: ['high_protein', 'family_friendly'],
    activeMinutes: 20,
    totalMinutes: 25,
    perServing: { ground_beef: 150, broccoli: 150, jasmine_rice: 75, soy_sauce: 15, garlic: 1 },
    steps: [
      'Start the rice with 2× its volume of water. Cover and simmer 15 minutes.',
      'Brown the beef in a skillet, 6–7 minutes. Drain any excess fat.',
      'Add broccoli, minced garlic, soy sauce, and 2 tablespoons of water. Cover 4 minutes.',
      'Serve over rice.',
    ],
  },
  {
    id: 'd_chicken_fajitas',
    name: 'Sheet-pan chicken fajitas',
    slot: 'dinner',
    goals: ['high_protein', 'low_effort', 'family_friendly'],
    activeMinutes: 10,
    totalMinutes: 30,
    perServing: { chicken_breast: 170, bell_pepper: 1, onion: 0.5, flour_tortillas: 2, greek_yogurt: 40, lime: 0.5, chili_powder: 3, olive_oil: 10 },
    steps: [
      'Heat the oven to 425°F. Slice chicken, peppers, and onion into strips.',
      'Toss with oil, chili powder, and salt on a sheet pan.',
      'Roast 18–20 minutes, until chicken is cooked through.',
      'Squeeze lime over the pan. Serve in warm tortillas with Greek yogurt.',
    ],
  },
  {
    id: 'd_turkey_meatball_pasta',
    name: 'Turkey meatballs with marinara pasta',
    slot: 'dinner',
    goals: ['high_protein', 'family_friendly'],
    activeMinutes: 20,
    totalMinutes: 30,
    perServing: { ground_turkey: 150, eggs: 0.25, parmesan: 10, pasta: 85, marinara: 120, spinach: 40 },
    steps: [
      'Bring a pot of salted water to a boil for the pasta.',
      'Mix turkey, egg, half the parmesan, salt, and pepper. Roll into 1-inch meatballs.',
      'Brown meatballs in a deep skillet, 5 minutes. Add marinara, cover, and simmer 10 minutes.',
      'Cook pasta. Stir spinach into the sauce until wilted. Serve with remaining parmesan.',
    ],
  },
  {
    id: 'd_egg_fried_rice',
    name: 'Egg and edamame fried rice',
    slot: 'dinner',
    goals: ['high_protein', 'low_effort'],
    activeMinutes: 15,
    totalMinutes: 15,
    perServing: { eggs: 2, frozen_edamame: 80, frozen_brown_rice: 150, frozen_stirfry_veg: 100, soy_sauce: 15, olive_oil: 10 },
    steps: [
      'Stir-fry the frozen vegetables and edamame in oil over high heat, 4 minutes.',
      'Add rice straight from frozen. Cook, stirring, 4 minutes.',
      'Push rice aside, scramble the eggs in the space, then mix through.',
      'Season with soy sauce.',
    ],
  },
  {
    id: 'd_greek_chicken_salad',
    name: 'Greek chicken thigh salad',
    slot: 'dinner',
    goals: ['low_carb', 'high_protein'],
    activeMinutes: 15,
    totalMinutes: 25,
    perServing: { chicken_thigh: 170, cucumber: 0.5, cherry_tomatoes: 100, feta: 30, spinach: 60, lemon: 0.5, olive_oil: 15 },
    steps: [
      'Season chicken with salt, pepper, and lemon zest.',
      'Cook in oil over medium-high heat, 5–6 minutes per side, until cooked through. Rest 5 minutes.',
      'Chop cucumber and halve tomatoes. Toss with spinach, lemon juice, and remaining oil.',
      'Slice chicken over the salad and crumble feta on top.',
    ],
  },
  {
    id: 'd_turkey_lettuce_wraps',
    name: 'Turkey lettuce wraps',
    slot: 'dinner',
    goals: ['low_carb', 'low_effort', 'high_protein'],
    activeMinutes: 15,
    totalMinutes: 20,
    perServing: { ground_turkey: 150, butter_lettuce: 0.5, carrots: 50, garlic: 1, coconut_aminos: 20, lime: 0.25, olive_oil: 5 },
    steps: [
      'Brown turkey in oil with minced garlic, 7 minutes.',
      'Stir in coconut aminos and cook 1 minute more.',
      'Spoon into lettuce leaves. Top with carrots and a squeeze of lime.',
    ],
  },
  {
    id: 'd_tofu_chickpea_curry',
    name: 'Tofu and chickpea coconut curry',
    slot: 'dinner',
    goals: ['family_friendly', 'low_effort'],
    activeMinutes: 15,
    totalMinutes: 30,
    perServing: { tofu: 150, chickpeas: 120, coconut_milk: 100, red_curry_paste: 15, spinach: 60, jasmine_rice: 75 },
    steps: [
      'Start the rice with 2× its volume of water. Cover and simmer 15 minutes.',
      'Press and cube the tofu. Brown in a nonstick pan, 6 minutes.',
      'Stir in curry paste for 30 seconds, then coconut milk and drained chickpeas. Simmer 8 minutes.',
      'Stir in spinach until wilted. Serve over rice.',
    ],
  },
  {
    id: 'd_sausage_peppers_potatoes',
    name: 'Chicken sausage with peppers and potatoes',
    slot: 'dinner',
    goals: ['low_effort', 'family_friendly'],
    activeMinutes: 10,
    totalMinutes: 25,
    perServing: { chicken_sausage: 2, bell_pepper: 0.5, onion: 0.5, baby_potatoes: 200, olive_oil: 10 },
    steps: [
      'Halve the potatoes and microwave, covered, 5 minutes.',
      'Slice sausage, pepper, and onion.',
      'Cook everything in oil in a large skillet over medium-high heat, 12–15 minutes, until browned.',
    ],
  },
  {
    id: 'd_sausage_white_beans',
    name: 'Chicken sausage and white bean skillet',
    slot: 'dinner',
    goals: ['low_effort', 'family_friendly', 'high_protein'],
    activeMinutes: 15,
    totalMinutes: 20,
    perServing: { chicken_sausage: 2, cannellini: 120, spinach: 60, garlic: 1, olive_oil: 5 },
    steps: [
      'Slice sausage and brown in oil, 5 minutes.',
      'Add minced garlic and drained beans. Cook 4 minutes.',
      'Stir in spinach until wilted. Season with salt and pepper.',
    ],
  },
  {
    id: 'd_sirloin_green_beans',
    name: 'Sirloin with garlic green beans',
    slot: 'dinner',
    goals: ['low_carb', 'high_protein'],
    activeMinutes: 15,
    totalMinutes: 20,
    perServing: { sirloin: 170, green_beans: 150, garlic: 1, olive_oil: 10, salt_pepper: 2 },
    steps: [
      'Pat the steak dry and season with salt and pepper.',
      'Sear in a hot pan with oil, 4–5 minutes per side for medium. Rest 5 minutes.',
      'In the same pan, cook green beans and minced garlic, 5 minutes.',
      'Slice the steak and serve with the beans.',
    ],
  },
  {
    id: 'd_salmon_quinoa',
    name: 'Lemon salmon with quinoa and spinach',
    slot: 'dinner',
    goals: ['high_protein'],
    activeMinutes: 15,
    totalMinutes: 25,
    perServing: { salmon: 170, quinoa: 60, spinach: 60, lemon: 0.5, olive_oil: 10 },
    steps: [
      'Rinse quinoa and simmer with 2× its volume of water, covered, 15 minutes.',
      'Season salmon and cook skin-side down in oil, 5 minutes. Flip and cook 3 minutes more.',
      'Fold spinach into the hot quinoa. Serve with salmon and lemon.',
    ],
  },
  {
    id: 'd_batch_turkey_chili',
    name: 'Big-batch turkey and bean chili',
    slot: 'dinner',
    goals: ['high_protein', 'family_friendly'],
    batch: true,
    activeMinutes: 20,
    totalMinutes: 60,
    perServing: { ground_turkey: 150, black_beans: 120, diced_tomatoes: 200, onion: 0.25, bell_pepper: 0.25, chili_powder: 5 },
    steps: [
      'Dice onion and pepper. Soften in a large pot, 5 minutes.',
      'Add turkey and chili powder. Brown, 8 minutes.',
      'Add tomatoes and drained beans. Simmer, partly covered, 40 minutes.',
      'Refrigerate leftovers within 2 hours. Keeps 4 days.',
    ],
  },
  {
    id: 'd_batch_roast_thighs',
    name: 'Roast chicken thighs with sweet potatoes and broccoli',
    slot: 'dinner',
    goals: ['high_protein', 'low_effort'],
    batch: true,
    activeMinutes: 10,
    totalMinutes: 50,
    perServing: { chicken_thigh: 200, sweet_potato: 200, broccoli: 150, olive_oil: 10, salt_pepper: 2 },
    steps: [
      'Heat the oven to 425°F. Cube sweet potatoes and toss with half the oil.',
      'Arrange thighs and sweet potatoes on two sheet pans. Roast 25 minutes.',
      'Add broccoli with the remaining oil. Roast 15 minutes more, until chicken reaches 165°F.',
      'Refrigerate extra portions within 2 hours. Keeps 3 days.',
    ],
  },
];

const lunches: RawRecipe[] = [
  {
    id: 'l_chicken_bean_bowls',
    name: 'Chicken, rice, and black bean lunch bowls',
    slot: 'lunch',
    goals: ['high_protein', 'family_friendly', 'low_effort'],
    batch: true,
    activeMinutes: 15,
    totalMinutes: 35,
    perServing: { chicken_breast: 150, jasmine_rice: 60, black_beans: 80, salsa: 40 },
    steps: [
      'Cook the rice. Season and bake the chicken at 425°F for 20 minutes.',
      'Slice the chicken. Divide rice, beans, and chicken between containers.',
      'Pack salsa separately. Refrigerate up to 4 days.',
    ],
  },
  {
    id: 'l_yogurt_chicken_wraps',
    name: 'Greek yogurt chicken salad wraps',
    slot: 'lunch',
    goals: ['high_protein', 'low_effort'],
    activeMinutes: 20,
    totalMinutes: 30,
    perServing: { chicken_breast: 120, greek_yogurt: 60, cucumber: 0.25, spinach: 30, flour_tortillas: 1, lemon: 0.25 },
    steps: [
      'Poach chicken in simmering water, 15 minutes. Cool and shred.',
      'Mix with Greek yogurt, diced cucumber, lemon juice, salt, and pepper.',
      'Store the filling. Assemble wraps with spinach the morning you eat them.',
    ],
  },
  {
    id: 'l_egg_quinoa_boxes',
    name: 'Egg, quinoa, and edamame boxes',
    slot: 'lunch',
    goals: ['high_protein', 'low_carb'],
    activeMinutes: 10,
    totalMinutes: 25,
    perServing: { eggs: 2, quinoa: 50, frozen_edamame: 80, cherry_tomatoes: 80 },
    steps: [
      'Simmer quinoa with 2× its volume of water, covered, 15 minutes.',
      'Hard-boil the eggs, 10 minutes. Cool in cold water and peel.',
      'Thaw edamame under warm water. Divide everything between containers.',
    ],
  },
  {
    id: 'l_turkey_hummus_boxes',
    name: 'Turkey, hummus, and vegetable boxes',
    slot: 'lunch',
    goals: ['low_effort', 'family_friendly'],
    activeMinutes: 10,
    totalMinutes: 10,
    perServing: { deli_turkey: 100, hummus: 60, cucumber: 0.5, carrots: 60, whole_wheat_pita: 1 },
    steps: [
      'Slice cucumber. Portion hummus into small containers.',
      'Divide turkey, vegetables, and pita between lunch boxes.',
    ],
  },
  {
    id: 'l_tuna_white_bean_salad',
    name: 'Tuna and white bean salad',
    slot: 'lunch',
    goals: ['low_carb', 'high_protein', 'low_effort'],
    activeMinutes: 10,
    totalMinutes: 10,
    perServing: { canned_tuna: 120, cannellini: 100, spinach: 40, cherry_tomatoes: 60, lemon: 0.25, olive_oil: 10 },
    steps: [
      'Drain tuna and beans. Halve the tomatoes.',
      'Toss with lemon juice, oil, salt, and pepper.',
      'Pack spinach separately so it stays crisp.',
    ],
  },
];

function build(r: RawRecipe) {
  return RecipeSchema.parse({
    ...r,
    batch: r.batch ?? false,
    perServing: Object.entries(r.perServing).map(([ingredientId, amount]) => ({ ingredientId, amount })),
  });
}

export const DINNER_RECIPES: readonly Recipe[] = dinners.map(build);
export const LUNCH_RECIPES: readonly Recipe[] = lunches.map(build);
export const RECIPES: readonly Recipe[] = [...DINNER_RECIPES, ...LUNCH_RECIPES];
export const RECIPES_BY_ID: ReadonlyMap<string, Recipe> = new Map(RECIPES.map((r) => [r.id, r]));

export function getRecipe(id: string): Recipe {
  const recipe = RECIPES_BY_ID.get(id);
  if (!recipe) throw new Error(`Unknown recipe: ${id}`);
  return recipe;
}
