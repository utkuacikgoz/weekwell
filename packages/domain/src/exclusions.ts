/**
 * Deterministic allergy and exclusion checks. The model never decides whether
 * a meal is safe; this module does.
 */
import { INGREDIENTS_BY_ID } from './catalog/ingredients';
import type { Recipe } from './catalog/recipes';
import {
  ExclusionSchema,
  MAX_CUSTOM_EXCLUSIONS,
  PRESET_EXCLUSIONS,
  type Allergen,
  type Ingredient,
  type PresetExclusion,
} from './schemas';

export const PRESET_EXCLUSION_LABEL: Record<PresetExclusion, string> = {
  dairy: 'Dairy-free',
  gluten: 'Gluten-free',
  nuts: 'Nut-free',
};

/** Words that map to a tracked allergen. Anything else is matched by ingredient name. */
const ALLERGEN_WORDS: Record<string, Allergen[]> = {
  dairy: ['dairy'],
  milk: ['dairy'],
  lactose: ['dairy'],
  cheese: ['dairy'],
  gluten: ['gluten'],
  wheat: ['gluten'],
  nut: ['tree_nuts', 'peanuts'],
  nuts: ['tree_nuts', 'peanuts'],
  'tree nut': ['tree_nuts'],
  'tree nuts': ['tree_nuts'],
  peanut: ['peanuts'],
  peanuts: ['peanuts'],
  soy: ['soy'],
  egg: ['egg'],
  eggs: ['egg'],
  fish: ['fish'],
  shellfish: ['shellfish'],
  shrimp: ['shellfish'],
  sesame: ['sesame'],
};

function singular(term: string): string {
  if (term.endsWith('ies')) return `${term.slice(0, -3)}y`;
  if (term.endsWith('oes')) return term.slice(0, -2);
  if (term.endsWith('s') && !term.endsWith('ss')) return term.slice(0, -1);
  return term;
}

export type ParsedExclusion =
  | { ok: true; term: string }
  | { ok: false; message: string };

/** Validate a custom exclusion typed by the user. */
export function parseCustomExclusion(input: string, existing: readonly string[]): ParsedExclusion {
  const result = ExclusionSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, message: 'Use letters only, like “mushrooms” or “pork”.' };
  }
  const term = result.data.replace(/\s+/gu, ' ');
  if (existing.includes(term)) return { ok: false, message: `“${term}” is already excluded.` };
  const customCount = existing.filter((e) => !(PRESET_EXCLUSIONS as readonly string[]).includes(e)).length;
  if (customCount >= MAX_CUSTOM_EXCLUSIONS) {
    return { ok: false, message: `You can add up to ${MAX_CUSTOM_EXCLUSIONS} custom exclusions.` };
  }
  return { ok: true, term };
}

/** Allergens implied by an exclusion term, if any. */
export function allergensForExclusion(term: string): Allergen[] {
  const t = term.trim().toLowerCase();
  return ALLERGEN_WORDS[t] ?? ALLERGEN_WORDS[singular(t)] ?? [];
}

function ingredientWords(ingredient: Ingredient): string[] {
  return [ingredient.name, ingredient.id.replace(/_/gu, ' '), ...ingredient.aliases].map((w) => w.toLowerCase());
}

/** True if this ingredient must be excluded for the term. */
export function ingredientMatchesExclusion(ingredient: Ingredient, term: string): boolean {
  const t = term.trim().toLowerCase();
  const allergens = allergensForExclusion(t);
  if (allergens.some((a) => ingredient.allergens.includes(a))) return true;
  const needles = new Set([t, singular(t)]);
  return ingredientWords(ingredient).some((w) => {
    const words = w.split(/[^a-z]+/u).filter(Boolean).map(singular);
    for (const n of needles) {
      if (w === n || words.includes(singular(n))) return true;
      // multi-word terms such as "sweet potato"
      if (n.includes(' ') && w.includes(n)) return true;
    }
    return false;
  });
}

export type ExclusionConflict = { term: string; ingredientId: string; ingredientName: string };

/** Every (exclusion, ingredient) pair that conflicts in a list of ingredient ids. */
export function findConflicts(ingredientIds: readonly string[], exclusions: readonly string[]): ExclusionConflict[] {
  const conflicts: ExclusionConflict[] = [];
  for (const id of ingredientIds) {
    const ingredient = INGREDIENTS_BY_ID.get(id);
    if (!ingredient) continue;
    for (const term of exclusions) {
      if (ingredientMatchesExclusion(ingredient, term)) {
        conflicts.push({ term, ingredientId: id, ingredientName: ingredient.name });
      }
    }
  }
  return conflicts;
}

export function recipeIsAllowed(recipe: Recipe, exclusions: readonly string[]): boolean {
  return findConflicts(
    recipe.perServing.map((p) => p.ingredientId),
    exclusions,
  ).length === 0;
}

export function allergensOf(ingredientIds: readonly string[]): Allergen[] {
  const set = new Set<Allergen>();
  for (const id of ingredientIds) {
    for (const a of INGREDIENTS_BY_ID.get(id)?.allergens ?? []) set.add(a);
  }
  return [...set].sort();
}

/** True when a custom term matches nothing we know about; the UI says so honestly. */
export function exclusionMatchesNothing(term: string): boolean {
  if (allergensForExclusion(term).length > 0) return false;
  for (const ingredient of INGREDIENTS_BY_ID.values()) {
    if (ingredientMatchesExclusion(ingredient, term)) return false;
  }
  return true;
}

export function exclusionLabel(term: string): string {
  if ((PRESET_EXCLUSIONS as readonly string[]).includes(term)) return PRESET_EXCLUSION_LABEL[term as PresetExclusion];
  return `No ${term}`;
}
