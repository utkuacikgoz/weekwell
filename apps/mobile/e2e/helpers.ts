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
  await $(page, `store-${opts.store ?? 'trader_joes'}`).click();
  if (opts.budget && [60, 80, 100].includes(opts.budget)) await $(page, `budget-${opts.budget}`).click();
  else if (opts.budget) {
    await $(page, 'budget-custom').click();
    const input = $(page, 'budget-input');
    await input.fill(String(opts.budget));
    await input.blur();
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

export async function buildWeek(page: Page, opts: Parameters<typeof onboard>[1] = {}) {
  await onboard(page, opts);
  await $(page, 'generate').click();
  await expect($(page, 'tonight-card')).toBeVisible({ timeout: 15_000 });
}

export async function visibleText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText);
}
