# Food art: two directions (design audit 2026-09-24)

Status: `design_pending`. Nothing in the app uses either direction yet. The screens keep today's flat plates until one of these directions is approved (audit instruction: "Do not expand the current SVG plate system until one direction is approved").

Board: `/review/food?review=1` in the web preview (six meals, both directions). `?only=b` shows the illustrations alone.

| File | What it shows |
|---|---|
| `b-illustration-six-meals.png` | Direction B for all six meals, at 540×360 each |
| `01-board-390.png` | The board at 390×844 |
| `02-one-meal-both-directions.png` | One meal (sheet-pan salmon): A's photo slot and shot brief beside B's illustration and its 60pt thumbnail |

## The six meals

These six cover the main dish shapes, so the choice holds for all 22 recipes:

1. Garlic chicken, rice, and broccoli bowls: deep bowl.
2. Sheet-pan salmon with potatoes and green beans: sheet pan.
3. Turkey meatballs with marinara pasta: pasta bowl.
4. Tofu and chickpea coconut curry: curry bowl (plant protein).
5. Sheet-pan chicken fajitas: skillet with tortillas.
6. Greek yogurt chicken salad wraps: board (a lunch).

## Direction A: editorial photography

This build has **no photographs**: the container can't reach any licensed source, and it has no image generator. A's frames are labelled placeholders, each with its shot brief. The spec, which is also in `src/review/foodDirections.ts`, is:
- **Look:** 3/4 view from about 45°, soft window light from the upper left, matte stoneware on warm linen, shallow depth of field on the main protein, a portion for one person, no hands, no text and no packaging, and a warm neutral grade.
- **Crops:** 16:9 hero, and a square 1:1 thumbnail from the same shot.
- **Prompts:** each meal has a prompt that goes after the fixed style prompt, so generated stills would come out as one set.

## Direction B: refined illustration

The six scenes are drawn in `src/review/foodDirections.ts`:
- a 3/4 view with one light from the upper left;
- the right dish for each meal, so meals differ by silhouette, not only colour;
- ingredient shapes you can recognise: florets with stems, a salmon fillet with fat lines, seared meatballs, ridged penne, chickpeas with seams, pepper ribbons, and a wrap cut to show its filling;
- paper grain, and a warm ink outline on the main shapes only.

Known limits:
- At the 60pt thumbnail size, detail drops and the dish reads mostly by shape and colour.
- Drawing all 22 recipes by hand is real work: about one scene per recipe, and more if portions change with household size.

## Decision needed (product owner)

**Recommendation: A, editorial photography, using generated stills.** Use the fixed style prompt and the per-meal prompts above, and have a person check every image against the recipe's actual ingredients. This is the audit's recommendation for this audience, it looks the most appetising, and it's the cheapest way to get one consistent look across all 22 recipes. Before any screen uses it:
- produce the six stills, approve them, then do the other 16;
- label them as illustrative, not as the exact dish you'll get.

Alternatives:
1. **A, with a commissioned shoot.** This gives the strongest result and full rights. It is the most expensive and slowest option, and every new recipe needs another shoot.
2. **B, refined illustration.** It's distinctive, and every image shows exactly the ingredients in the recipe. It can be done inside the codebase now, and dark mode is straightforward. On the other hand, it's less appetising than photos, and the thumbnail size limits what it can show.

Not recommended: licensed stock photos. The dishes won't match the recipes, and the look won't be consistent.
