/**
 * Food photography brief (D-038: photography chosen by the product owner,
 * 2026-09-24). One 4:3 master per recipe. The app crops it to a 16:9 hero
 * and a 1:1 thumbnail, so keep the dish centred with room around it.
 *
 * Plain data with no React Native imports: `scripts/meal-photos.ts` turns it
 * into the prompt file and the checklist.
 */

export const PHOTO_SPEC = {
  master: { width: 1600, height: 1200, maxKB: 500, formats: ['jpg', 'jpeg', 'png'] as const },
  style:
    'Editorial food photograph, 3/4 view from about 45 degrees, soft window light from the upper left, matte stoneware on warm natural linen, shallow depth of field focused on the main protein, a portion for one person, no hands, no text, no brand packaging, warm neutral colour grade, 4:3 frame with the dish centred and 15% breathing room on every side.',
  rules: [
    'Show only ingredients that are in the recipe. Garnish only with recipe ingredients.',
    'One dish per photo, in the vessel named in the brief.',
    'Same light, surface and grade across all 22. Reshoot any image that breaks the set.',
    'Generated stills are labelled "Illustrative photo" in the About sheet and store listing. A person checks every image against the ingredient list before it ships.',
  ],
} as const;

export type Shot = { recipeId: string; vessel: string; prompt: string };

export const SHOTS: Shot[] = [
  { recipeId: 'd_chicken_rice_bowls', vessel: 'deep cream bowl', prompt: 'Garlic-glazed chicken pieces, jasmine rice and broccoli florets in a deep cream stoneware bowl.' },
  { recipeId: 'd_turkey_taco_skillet', vessel: 'cast-iron skillet', prompt: 'Ground turkey with black beans, bell peppers and onion in a cast-iron skillet, spoon of salsa on top, warm corn tortillas folded beside it.' },
  { recipeId: 'd_sheet_pan_salmon', vessel: 'sheet pan', prompt: 'One roasted salmon fillet with halved baby potatoes and green beans on a lightly used metal sheet pan, lemon slices.' },
  { recipeId: 'd_shrimp_stir_fry', vessel: 'shallow bowl', prompt: 'Shrimp and mixed stir-fry vegetables in a glossy garlic-soy sauce over brown rice in a shallow bowl.' },
  { recipeId: 'd_beef_broccoli', vessel: 'shallow bowl', prompt: 'Browned ground beef and broccoli in a garlic-soy sauce over jasmine rice in a shallow bowl.' },
  { recipeId: 'd_chicken_fajitas', vessel: 'sheet pan + tortillas', prompt: 'Chili-rubbed chicken strips with red, yellow and green peppers and onion on a sheet pan, flour tortillas, a small bowl of Greek yogurt and lime wedges beside it.' },
  { recipeId: 'd_turkey_meatball_pasta', vessel: 'wide pasta bowl', prompt: 'Pasta with marinara, five turkey meatballs and wilted baby spinach in a wide dark-blue pasta bowl, finely grated parmesan.' },
  { recipeId: 'd_egg_fried_rice', vessel: 'shallow bowl', prompt: 'Brown-rice fried rice with scrambled egg, edamame and mixed vegetables in a shallow bowl.' },
  { recipeId: 'd_greek_chicken_salad', vessel: 'wide salad bowl', prompt: 'Sliced seared chicken thighs over baby spinach, cucumber, halved cherry tomatoes and crumbled feta in a wide bowl, lemon wedge, olive oil.' },
  { recipeId: 'd_turkey_lettuce_wraps', vessel: 'platter', prompt: 'Butter-lettuce cups filled with garlicky ground turkey and shredded carrot on a platter, lime wedges.' },
  { recipeId: 'd_tofu_chickpea_curry', vessel: 'curry bowl', prompt: 'Golden red-curry coconut sauce with tofu cubes, chickpeas and wilted spinach in a sage-green bowl, jasmine rice on the side.' },
  { recipeId: 'd_sausage_peppers_potatoes', vessel: 'sheet pan', prompt: 'Sliced chicken sausage with roasted bell peppers, onion and baby potatoes on a sheet pan.' },
  { recipeId: 'd_sausage_white_beans', vessel: 'skillet', prompt: 'Browned chicken sausage coins with white beans, garlic and wilted spinach in a skillet.' },
  { recipeId: 'd_sirloin_green_beans', vessel: 'plate', prompt: 'Sliced seared sirloin steak, pink in the middle, with garlicky green beans on a matte plate.' },
  { recipeId: 'd_salmon_quinoa', vessel: 'plate', prompt: 'Lemon salmon fillet on quinoa with wilted baby spinach on a matte plate, lemon slice.' },
  { recipeId: 'd_batch_turkey_chili', vessel: 'pot + bowl', prompt: 'Turkey and black bean chili with tomatoes and peppers in a bowl, the pot softly out of focus behind it.' },
  { recipeId: 'd_batch_roast_thighs', vessel: 'roasting tray', prompt: 'Roast chicken thighs with crisp skin, sweet potato chunks and broccoli on a roasting tray.' },
  { recipeId: 'l_chicken_bean_bowls', vessel: 'lunch container', prompt: 'Lunch container with chicken, jasmine rice, black beans and a scoop of salsa in neat sections.' },
  { recipeId: 'l_yogurt_chicken_wraps', vessel: 'board', prompt: 'Two halves of a Greek-yogurt chicken salad wrap with cucumber and spinach, cut to show the filling, on a wooden board, lemon.' },
  { recipeId: 'l_egg_quinoa_boxes', vessel: 'lunch container', prompt: 'Lunch container with quinoa, halved hard-boiled eggs, edamame and cherry tomatoes in sections.' },
  { recipeId: 'l_turkey_hummus_boxes', vessel: 'lunch container', prompt: 'Lunch container with rolled turkey slices, hummus, cucumber, shredded carrot and whole-wheat pita triangles.' },
  { recipeId: 'l_tuna_white_bean_salad', vessel: 'bowl', prompt: 'Tuna and white bean salad with baby spinach and cherry tomatoes in a bowl, lemon and olive oil dressing.' },
];

export const fullPrompt = (s: Shot) => `${s.prompt} ${PHOTO_SPEC.style}`;
