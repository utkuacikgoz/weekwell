import { expect, type Page } from '@playwright/test';

/** Hidden stack screens stay mounted on web; only match what the user can see. */
export const $ = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

export async function onboard(
  page: Page,
  opts: { store?: 'trader_joes' | 'walmart'; budget?: number; time?: '20' | '30' | 'batch'; household?: '1' | '2' | '3_4'; exclusions?: string[]; query?: string } = {},
) {
  await page.goto(`/onboarding${opts.query ? `?${opts.query}` : ''}`);
  await $(page, 'start').click();
  await $(page, `store-${opts.store ?? 'trader_joes'}`).click();
  await $(page, 'continue').click();
  if (opts.budget) {
    const input = $(page, 'budget-input');
    await input.fill(String(opts.budget));
    await input.blur();
  }
  await $(page, 'continue').click();
  await $(page, 'continue').click(); // goal: default High protein
  if (opts.time) await $(page, `time-${opts.time}`).click();
  await $(page, 'continue').click();
  if (opts.household) await $(page, `household-${opts.household}`).click();
  await $(page, 'continue').click();
  for (const e of opts.exclusions ?? []) await $(page, `exclusion-${e}`).click();
  await $(page, 'continue').click();
  await expect(page.getByText('Check your choices').filter({ visible: true })).toBeVisible();
}

export async function buildWeek(page: Page, opts: Parameters<typeof onboard>[1] = {}) {
  await onboard(page, opts);
  await $(page, 'generate').click();
  await expect(page.getByText('Your week is ready.').filter({ visible: true })).toBeVisible({ timeout: 15_000 });
}

export async function visibleText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText);
}
