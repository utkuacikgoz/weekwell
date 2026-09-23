# System dark mode: review v2 (wave 6)

**Approval status: design_pending.**

The same roles as light mode, inverted. The background is a warm near-black (not pure black), with warm off-white ink, a lighter leaf green for actions (dark text on green buttons), and a lighter citrus for price attention. Meal tiles darken; plates stay light, like real dishes.

- **Behavior:** the app follows the system appearance **at launch**. A change while the app is open applies on the next launch; the web preview reloads immediately. This is recorded in D-027.
- **Contrast:** every text pair in both palettes is at least 4.5:1, and control outlines are at least 3:1 (`test/contrast.test.ts`, 35 checks).

| File | State |
|---|---|
| [01-welcome.png](01-welcome.png) | Welcome |
| [02-store-budget.png](02-store-budget.png) | Setup step 1 |
| [03-week.png](03-week.png) | Week |
| [04-meal.png](04-meal.png) | Meal detail |
| [05-grocery-checked-toast.png](05-grocery-checked-toast.png) | Grocery with undo toast |
| [06-about-sheet.png](06-about-sheet.png) | About this estimate sheet |
| [07-paywall.png](07-paywall.png) | Paywall |
| [08-week-over-budget.png](08-week-over-budget.png) | Over budget (citrus attention) |

Open question: live switching without a relaunch needs every style to read the theme at render time. Recommend doing it after the pilot. The alternative is to do it now (a wide mechanical refactor).
