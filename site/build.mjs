/**
 * Builds the public Weekwell site (privacy, consumer health data, terms,
 * support) into site/_dist. Values come from site.config.json; the build fails
 * while any value is still a TODO, so placeholders are never published.
 *
 *   node site/build.mjs            # build (fails on TODOs)
 *   node site/build.mjs --preview  # build anyway, marking TODOs, for local review
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const here = import.meta.dirname;
const preview = process.argv.includes('--preview');
const config = JSON.parse(readFileSync(join(here, 'site.config.json'), 'utf8'));
const todo = Object.entries(config).filter(([k, v]) => !k.startsWith('_') && String(v).startsWith('TODO'));
if (todo.length && !preview) {
  console.error(`site.config.json still has TODO values: ${todo.map(([k]) => k).join(', ')}`);
  process.exit(1);
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fill = (html) =>
  html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in config)) throw new Error(`unknown placeholder {{${key}}}`);
    const v = String(config[key]);
    return v.startsWith('TODO') ? `<mark>[${esc(key)}]</mark>` : esc(v);
  });

const PAGES = [
  { file: 'index.html', title: 'Weekwell', nav: null },
  { file: 'privacy.html', title: 'Privacy policy', nav: 'Privacy' },
  { file: 'health-data.html', title: 'Consumer health data privacy policy', nav: 'Health data' },
  { file: 'terms.html', title: 'Terms of use', nav: 'Terms' },
  { file: 'support.html', title: 'Support', nav: 'Support' },
];
const out = join(here, '_dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
copyFileSync(join(here, 'src/style.css'), join(out, 'style.css'));
for (const page of PAGES) {
  const body = fill(readFileSync(join(here, 'src', page.file), 'utf8'));
  const nav = PAGES.filter((p) => p.nav)
    .map((p) => `<a href="${p.file}"${p.file === page.file ? ' aria-current="page"' : ''}>${p.nav}</a>`)
    .join('');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title === 'Weekwell' ? 'Weekwell' : `${page.title} · Weekwell`)}</title>
<meta name="description" content="Weekwell plans five dinners and work lunches around your store, budget, and time.">
<link rel="stylesheet" href="style.css">
</head>
<body>
<header class="site"><a class="wordmark" href="index.html">Week<em>well</em></a><nav>${nav}</nav></header>
<main>
${body}
</main>
<footer>© ${new Date().getFullYear()} ${fill('{{company}}')}. Weekwell isn’t affiliated with Trader Joe’s, Walmart, or any other retailer.</footer>
</body>
</html>
`;
  writeFileSync(join(out, page.file), html);
}
console.log(`built ${readdirSync(out).length} files into site/_dist${todo.length ? ` (preview: ${todo.length} TODO values marked)` : ''}`);
