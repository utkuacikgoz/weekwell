# Meal photos (D-038)

Put one photo per recipe here, named by recipe id, for example `d_sheet_pan_salmon.jpg`. Then run `npm run photos` in `apps/mobile`.

- **File:** 4:3, at least 1600×1200, JPEG or PNG, under 500 KB (JPEG quality around 80).
- **Prompts:** one per recipe in `prompts.json`, with the fixed style already appended.
- **Checklist and spec:** `docs/release/food-photography-checklist.md`, regenerated each time you run `npm run photos`.
- **Switching over:** the app keeps the illustrated plates until all 22 photos are here and valid, then switches every screen at once.
- **Release gate:** `npm run photos -- --check` must pass.
