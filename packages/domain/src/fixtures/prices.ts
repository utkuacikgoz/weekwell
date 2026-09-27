/**
 * SAMPLE package prices for testing. These numbers were written for fixtures;
 * they were never checked at a store. Everything built from them is labelled
 * `locationScope: 'sample'` and the UI must say "Sample prices" (D-021).
 *
 * Product names are generic descriptions, not claims about a retailer's
 * actual catalog.
 */
import type { Retailer } from '../schemas';

export type SamplePackage = {
  productName: string;
  packageSize: string;
  /** Contents in the ingredient's canonical unit. */
  packageAmount: number;
  priceCents: number;
};

type Row = [ingredientId: string, tj: SamplePackage | null, walmart: SamplePackage | null];

const p = (productName: string, packageSize: string, packageAmount: number, priceCents: number): SamplePackage => ({
  productName,
  packageSize,
  packageAmount,
  priceCents,
});

const rows: Row[] = [
  ['chicken_breast', p('Boneless skinless chicken breast', '1.5 lb pack', 680, 699), p('Boneless skinless chicken breast', '2.5 lb pack', 1134, 947)],
  ['chicken_thigh', p('Boneless skinless chicken thighs', '1.5 lb pack', 680, 649), p('Boneless skinless chicken thighs', '2 lb pack', 907, 698)],
  ['ground_turkey', p('Ground turkey, 93% lean', '1 lb pack', 454, 499), p('Ground turkey, 93% lean', '1 lb pack', 454, 447)],
  ['ground_beef', p('Ground beef, 93% lean', '1 lb pack', 454, 649), p('Ground beef, 93% lean', '1 lb pack', 454, 597)],
  ['sirloin', p('Top sirloin steak', '1 lb pack', 454, 999), p('Top sirloin steak', '1 lb pack', 454, 897)],
  ['salmon', p('Salmon fillet', '1 lb', 454, 1199), p('Frozen salmon fillets', '1 lb bag', 454, 897)],
  ['shrimp', p('Frozen peeled shrimp', '1 lb bag', 454, 899), p('Frozen peeled shrimp', '1 lb bag', 454, 747)],
  ['chicken_sausage', p('Chicken sausage', '4 links', 4, 449), p('Chicken sausage', '4 links', 4, 497)],
  ['deli_turkey', p('Sliced turkey breast', '7 oz pack', 198, 449), p('Sliced turkey breast', '9 oz pack', 255, 397)],
  ['tofu', p('Extra-firm tofu', '14 oz block', 397, 199), p('Extra-firm tofu', '14 oz block', 397, 228)],
  ['hummus', p('Hummus', '10 oz tub', 283, 349), p('Hummus', '10 oz tub', 283, 348)],
  ['salsa', p('Salsa', '16 oz jar', 473, 329), p('Salsa', '16 oz jar', 473, 278)],
  ['eggs', p('Large eggs', '12 eggs', 12, 329), p('Large eggs', '12 eggs', 12, 312)],
  ['greek_yogurt', p('Plain nonfat Greek yogurt', '32 oz tub', 907, 499), p('Plain nonfat Greek yogurt', '32 oz tub', 907, 482)],
  ['feta', p('Crumbled feta', '6 oz', 170, 349), p('Crumbled feta', '6 oz', 170, 318)],
  ['parmesan', p('Grated parmesan', '5 oz', 142, 399), p('Grated parmesan', '5 oz', 142, 247)],
  ['flour_tortillas', p('Flour tortillas', '10 count', 10, 299), p('Flour tortillas', '10 count', 10, 248)],
  ['corn_tortillas', p('Corn tortillas', '18 count', 18, 249), p('Corn tortillas', '30 count', 30, 228)],
  ['whole_wheat_pita', p('Whole wheat pita', '6 count', 6, 229), p('Whole wheat pita', '6 count', 6, 268)],
  ['jasmine_rice', p('Jasmine rice', '2 lb bag', 907, 349), p('Jasmine rice', '2 lb bag', 907, 272)],
  ['quinoa', p('Quinoa', '16 oz bag', 454, 449), p('Quinoa', '12 oz bag', 340, 398)],
  ['pasta', p('Penne pasta', '16 oz box', 454, 99), p('Penne pasta', '16 oz box', 454, 108)],
  ['black_beans', p('Black beans', '15 oz can', 240, 99), p('Black beans', '15 oz can', 240, 88)],
  ['cannellini', p('Cannellini beans', '15 oz can', 240, 119), p('Cannellini beans', '15 oz can', 240, 98)],
  ['chickpeas', p('Chickpeas', '15 oz can', 240, 99), p('Chickpeas', '15 oz can', 240, 88)],
  ['canned_tuna', p('Tuna in water', '5 oz can', 142, 169), p('Tuna in water', '5 oz can', 142, 118)],
  ['marinara', p('Marinara sauce', '25 oz jar', 739, 299), p('Marinara sauce', '24 oz jar', 710, 228)],
  ['diced_tomatoes', p('Diced tomatoes', '14.5 oz can', 411, 129), p('Diced tomatoes', '14.5 oz can', 411, 98)],
  ['coconut_milk', p('Coconut milk', '13.5 oz can', 400, 179), p('Coconut milk', '13.5 oz can', 400, 198)],
  ['red_curry_paste', p('Red curry paste', '4 oz jar', 113, 299), p('Red curry paste', '4 oz jar', 113, 348)],
  ['soy_sauce', p('Soy sauce', '10 oz bottle', 296, 229), p('Soy sauce', '15 oz bottle', 444, 248)],
  ['coconut_aminos', p('Coconut aminos', '8.5 oz bottle', 251, 349), p('Coconut aminos', '8 oz bottle', 237, 448)],
  ['frozen_brown_rice', p('Frozen brown rice', '3 pouches (30 oz)', 850, 399), p('Frozen brown rice', '20 oz bag', 567, 248)],
  ['frozen_edamame', p('Frozen shelled edamame', '16 oz bag', 454, 249), p('Frozen shelled edamame', '12 oz bag', 340, 224)],
  ['frozen_stirfry_veg', p('Frozen stir-fry vegetables', '16 oz bag', 454, 299), p('Frozen stir-fry vegetables', '16 oz bag', 454, 218)],
  ['broccoli', p('Broccoli florets', '12 oz bag', 340, 279), p('Broccoli florets', '12 oz bag', 340, 228)],
  ['green_beans', p('Green beans', '12 oz bag', 340, 299), p('Green beans', '12 oz bag', 340, 248)],
  ['spinach', p('Baby spinach', '6 oz bag', 170, 229), p('Baby spinach', '10 oz tub', 283, 297)],
  ['bell_pepper', p('Bell peppers', '3 count', 3, 349), p('Bell pepper', '1 count', 1, 98)],
  ['onion', p('Yellow onion', '1 count', 1, 79), p('Yellow onions', '3 lb bag (about 6)', 6, 348)],
  ['garlic', p('Garlic', '1 head (about 10 cloves)', 10, 99), p('Garlic', '1 head (about 10 cloves)', 10, 68)],
  ['lemon', p('Lemon', '1 count', 1, 69), p('Lemon', '1 count', 1, 58)],
  ['lime', p('Lime', '1 count', 1, 49), p('Lime', '1 count', 1, 44)],
  ['cucumber', p('Cucumber', '1 count', 1, 99), p('Cucumber', '1 count', 1, 72)],
  ['cherry_tomatoes', p('Cherry tomatoes', '10 oz', 283, 299), p('Cherry tomatoes', '10 oz', 283, 247)],
  ['baby_potatoes', p('Baby potatoes', '1.5 lb bag', 680, 349), p('Baby potatoes', '1.5 lb bag', 680, 298)],
  ['sweet_potato', p('Sweet potato', '1 count (about 8 oz)', 227, 129), p('Sweet potatoes', '3 lb bag', 1361, 397)],
  ['carrots', p('Shredded carrots', '10 oz bag', 283, 179), p('Shredded carrots', '10 oz bag', 283, 148)],
  ['butter_lettuce', p('Butter lettuce', '1 head', 1, 249), p('Butter lettuce', '1 head', 1, 228)],
  ['pork_tenderloin', p('Pork tenderloin', '1.25 lb pack', 567, 699), p('Pork tenderloin', '1.5 lb pack', 680, 747)],
  ['pork_chops', p('Boneless pork chops', '1.25 lb pack', 567, 649), p('Boneless pork chops', '1.5 lb pack', 680, 698)],
  ['cod', p('Frozen cod fillets', '1 lb bag', 454, 999), p('Frozen cod fillets', '1 lb bag', 454, 847)],
  ['tempeh', p('Tempeh', '8 oz pack', 227, 229), p('Tempeh', '8 oz pack', 227, 298)],
  ['pesto', p('Basil pesto', '6.7 oz jar', 190, 399), p('Basil pesto', '6 oz jar', 170, 348)],
  ['mozzarella', p('Shredded part-skim mozzarella', '12 oz bag', 340, 399), p('Shredded part-skim mozzarella', '8 oz bag', 227, 247)],
  ['cheddar', p('Shredded sharp cheddar', '12 oz bag', 340, 399), p('Shredded sharp cheddar', '8 oz bag', 227, 247)],
  ['burger_buns', p('Whole wheat burger buns', '8 count', 8, 349), p('Whole wheat burger buns', '8 count', 8, 268)],
  ['whole_wheat_bread', p('Whole wheat sandwich bread', '24 oz loaf (about 20 slices)', 20, 349), p('Whole wheat sandwich bread', '20 oz loaf (about 20 slices)', 20, 298)],
  ['naan', p('Plain naan', '4 count', 4, 299), p('Plain naan', '4 count', 4, 348)],
  ['rice_noodles', p('Rice noodles', '14 oz pack', 397, 299), p('Rice noodles', '14 oz pack', 397, 278)],
  ['rice_pasta', p('Brown rice pasta', '16 oz bag', 454, 299), p('Brown rice pasta', '12 oz box', 340, 248)],
  ['couscous', p('Couscous', '16 oz bag', 454, 249), p('Couscous', '10 oz box', 283, 218)],
  ['red_lentils', p('Red lentils', '16 oz bag', 454, 249), p('Red lentils', '16 oz bag', 454, 198)],
  ['brown_lentils', p('Brown lentils', '16 oz bag', 454, 199), p('Brown lentils', '16 oz bag', 454, 148)],
  ['pinto_beans', p('Pinto beans', '15 oz can', 240, 99), p('Pinto beans', '15 oz can', 240, 88)],
  ['kidney_beans', p('Kidney beans', '15 oz can', 240, 99), p('Kidney beans', '15 oz can', 240, 88)],
  ['chicken_broth', p('Chicken broth', '32 oz carton', 946, 229), p('Chicken broth', '32 oz carton', 946, 198)],
  ['vegetable_broth', p('Vegetable broth', '32 oz carton', 946, 229), p('Vegetable broth', '32 oz carton', 946, 198)],
  ['enchilada_sauce', p('Red enchilada sauce', '10 oz can', 296, 199), p('Red enchilada sauce', '10 oz can', 296, 148)],
  ['peanut_butter', p('Creamy peanut butter', '16 oz jar (about 1¾ cups)', 414, 299), p('Creamy peanut butter', '16 oz jar (about 1¾ cups)', 414, 248)],
  ['cashews', p('Roasted cashews', '8 oz bag', 227, 499), p('Roasted cashews', '8 oz can', 227, 548)],
  ['honey', p('Honey', '12 oz bottle (about 1 cup)', 237, 449), p('Honey', '12 oz bottle (about 1 cup)', 237, 398)],
  ['dijon', p('Dijon mustard', '8 oz jar', 237, 199), p('Dijon mustard', '12 oz bottle', 355, 218)],
  ['olives', p('Pitted kalamata olives', '9.5 oz jar (6 oz drained)', 170, 349), p('Pitted kalamata olives', '6 oz jar (4 oz drained)', 113, 278)],
  ['frozen_corn', p('Frozen corn', '16 oz bag', 454, 179), p('Frozen corn', '12 oz bag', 340, 118)],
  ['frozen_peas', p('Frozen peas', '16 oz bag', 454, 179), p('Frozen peas', '12 oz bag', 340, 118)],
  ['cauliflower_rice', p('Frozen cauliflower rice', '16 oz bag', 454, 299), p('Frozen cauliflower rice', '12 oz bag', 340, 224)],
  ['romaine', p('Romaine hearts', '3 count', 3, 349), p('Romaine hearts', '3 count', 3, 298)],
  ['coleslaw_mix', p('Coleslaw mix', '14 oz bag', 397, 199), p('Coleslaw mix', '14 oz bag', 397, 168)],
  ['kale', p('Chopped kale', '10 oz bag', 283, 249), p('Chopped kale', '16 oz bag', 454, 298)],
  ['zucchini', p('Zucchini', '1 count', 1, 99), p('Zucchini', '1 count', 1, 84)],
  ['mushrooms', p('Sliced white mushrooms', '8 oz pack', 227, 229), p('Sliced white mushrooms', '8 oz pack', 227, 198)],
  ['cauliflower', p('Cauliflower florets', '12 oz bag', 340, 299), p('Cauliflower florets', '12 oz bag', 340, 248)],
  ['asparagus', p('Asparagus', '1 lb bunch', 454, 349), p('Asparagus', '1 lb bunch', 454, 297)],
  ['snap_peas', p('Sugar snap peas', '8 oz bag', 227, 249), p('Sugar snap peas', '8 oz bag', 227, 248)],
  ['celery', p('Celery', '1 bunch (about 8 stalks)', 8, 199), p('Celery', '1 bunch (about 8 stalks)', 8, 168)],
  ['avocado', p('Avocado', '1 count', 1, 129), p('Avocado', '1 count', 1, 98)],
  ['green_onions', p('Green onions', '1 bunch (about 6)', 6, 99), p('Green onions', '1 bunch (about 6)', 6, 68)],
  ['ginger', p('Fresh ginger root', '1 piece (about 3 oz)', 85, 99), p('Fresh ginger root', '1 piece (about 3 oz)', 85, 78)],
  ['cilantro', p('Cilantro', '1 bunch', 1, 99), p('Cilantro', '1 bunch', 1, 78)],
];

export const SAMPLE_PACKAGES: Record<Retailer, ReadonlyMap<string, SamplePackage>> = {
  trader_joes: new Map(rows.filter(([, tj]) => tj).map(([id, tj]) => [id, tj as SamplePackage])),
  walmart: new Map(rows.filter(([, , wm]) => wm).map(([id, , wm]) => [id, wm as SamplePackage])),
};

/** When these sample numbers were written. Shown as-is; never presented as a store check. */
export const SAMPLE_PRICES_WRITTEN_AT = '2026-09-20T12:00:00.000Z';
export const SAMPLE_PRICE_SOURCE = 'Weekwell sample prices (not from a store)';
