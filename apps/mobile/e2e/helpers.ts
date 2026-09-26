import { expect, type Page } from '@playwright/test';

/** Hidden stack screens stay mounted on web; only match what the user can see. */
export const $ = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

export async function onboard(
  page: Page,
  opts: { store?: 'trader_joes' | 'walmart'; budget?: number; time?: '20' | '30' | 'batch'; household?: '1' | '2' | '3_4'; exclusions?: string[]; query?: string } = {},
) {
  await page.goto(`/onboarding${opts.query ? `?${opts.query}` : ''}`);
  await $(page, 'start').click();
  // Step 1: store and budget
  await pickStore(page, opts.store ?? 'trader_joes');
  if (opts.budget) {
    await $(page, 'budget-pick').click();
    if ([60, 80, 100].includes(opts.budget)) await $(page, `budget-${opts.budget}`).click();
    else {
      await $(page, 'budget-custom').click();
      const input = $(page, 'budget-input');
      await input.fill(String(opts.budget));
      await input.blur();
    }
    await $(page, 'budget-done').click();
  }
  await $(page, 'continue').click();
  // Step 2: goal (default High protein), time, people
  if (opts.time) await $(page, `time-${opts.time}`).click();
  if (opts.household) await $(page, `household-${opts.household}`).click();
  await $(page, 'continue').click();
  // Step 3: foods to leave out
  for (const e of opts.exclusions ?? []) await $(page, `exclusion-${e}`).click();
  await $(page, 'continue').click();
  await expect($(page, 'generate')).toBeVisible();
}

/** Setup 1 is a sentence (D-040 SB3): tap the store blank, then pick in the sheet, which closes on choice. */
export async function pickStore(page: Page, store: 'trader_joes' | 'walmart' = 'trader_joes') {
  await $(page, 'store-pick').click();
  await $(page, `store-${store}`).click();
  await expect($(page, 'store-sheet')).toHaveCount(0);
}

export async function buildWeek(page: Page, opts: Parameters<typeof onboard>[1] = {}) {
  await onboard(page, opts);
  await $(page, 'generate').click();
  await expect($(page, 'tonight-card')).toBeVisible({ timeout: 15_000 });
}

export async function visibleText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText);
}

/** In cooking mode, go to the first step that offers a timer. */
export async function findTimerStep(page: Page) {
  while ((await $(page, 'cook-prev').getAttribute('aria-disabled')) !== 'true') await $(page, 'cook-prev').click();
  for (let i = 0; i < 12 && (await $(page, 'cook-timer-start').count()) === 0; i++) {
    if ((await $(page, 'cook-next').innerText()) === 'Done') throw new Error('no step in this recipe has a timer');
    await $(page, 'cook-next').click();
  }
}
