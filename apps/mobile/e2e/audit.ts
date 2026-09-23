/** Shared visual + accessibility audit for review captures and the QA matrix. */
import { expect, type Page } from '@playwright/test';
import { FORBIDDEN_PHRASES } from '../src/forbidden.ts';
import { $ } from './helpers';

export async function audit(page: Page, name: string, opts: { primary?: string; out?: string } = {}) {
  await page.waitForTimeout(150);
  const report = await page.evaluate(() => {
    const vw = window.innerWidth;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && !el.closest('[aria-hidden="true"]');
    };
    const overflow: string[] = [];
    for (const el of Array.from(document.querySelectorAll('div[dir], span, div'))) {
      if (!visible(el) || el.children.length > 0 || !(el.textContent ?? '').trim()) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1) overflow.push(`${(el.textContent ?? '').slice(0, 40)} (${Math.round(r.right)}>${vw})`);
    }
    const small: string[] = [];
    for (const el of Array.from(document.querySelectorAll('[role=button],[role=radio],[role=checkbox],[role=link],[role=switch],input'))) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 43.5 || r.width < 43.5) small.push(`${el.getAttribute('aria-label') ?? el.textContent?.slice(0, 30)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    const unlabeled = Array.from(document.querySelectorAll('[role=button],[role=radio],[role=checkbox],[role=link],input'))
      .filter((el) => visible(el) && !(el.getAttribute('aria-label') || (el.textContent ?? '').trim()))
      .map((el) => el.outerHTML.slice(0, 80));
    return { overflow, small, unlabeled, text: document.body.innerText };
  });
  expect(report.overflow, `${name}: text past right edge`).toEqual([]);
  expect(report.small, `${name}: touch targets under 44px`).toEqual([]);
  expect(report.unlabeled, `${name}: controls without a label`).toEqual([]);
  for (const re of FORBIDDEN_PHRASES) expect(report.text, `${name}: ${re}`).not.toMatch(re);
  if (opts.primary) {
    const box = await $(page, opts.primary).boundingBox();
    expect(box, `${name}: primary action missing`).not.toBeNull();
    expect(box!.y + box!.height, `${name}: primary action below the fold`).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
  if (opts.out) await page.screenshot({ path: opts.out });
}

