/**
 * Builds the public Weekwell site (landing page, privacy, consumer health data,
 * terms, support) into site/_dist, deployed by Vercel to weekwell.pro (D-042).
 * Values come from site.config.json; the build fails while any value is still
 * a TODO, so placeholders are never published. Internal links are clean URLs
 * (/privacy), which Vercel serves from privacy.html (vercel.json cleanUrls).
 *
 *   node site/build.mjs            # build (fails on TODOs)
 *   node site/build.mjs --preview  # build anyway, marking TODOs, for local review
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const here = import.meta.dirname;
const preview = process.argv.includes('--preview');
const config = JSON.parse(readFileSync(join(here, 'site.config.json'), 'utf8'));
// `server`: whether a Weekwell server holds user data (D-039: false for the pilot).
const server = config.server === true;
const todo = Object.entries(config).filter(([k, v]) => !k.startsWith('_') && String(v).startsWith('TODO') && (server || k !== 'hostingProvider'));
// The postal address is optional: without it, <!--address-->…<!--/address--> blocks are left out.
const hasAddress = String(config.mailingAddress ?? '').trim() !== '';
if (todo.length && !preview) {
  console.error(`site.config.json still has TODO values: ${todo.map(([k]) => k).join(', ')}`);
  process.exit(1);
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/** <!--server-->…<!--/server--> only with a server; <!--device-->…<!--/device--> only without one. */
const choose = (html) =>
  html
    .replace(/<!--server-->([\s\S]*?)<!--\/server-->/g, (_, inner) => (server ? inner : ''))
    .replace(/<!--device-->([\s\S]*?)<!--\/device-->/g, (_, inner) => (server ? '' : inner))
    .replace(/<!--address-->([\s\S]*?)<!--\/address-->/g, (_, inner) => (hasAddress ? inner : ''));
/** privacy.html → /privacy, index.html → / */
const cleanLinks = (html) => html.replace(/href="([a-z-]+)\.html"/g, (_, name) => `href="/${name === 'index' ? '' : name}"`);
const fill = (html) =>
  choose(html).replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in config)) throw new Error(`unknown placeholder {{${key}}}`);
    const v = String(config[key]);
    return v.startsWith('TODO') ? `<mark>[${esc(key)}]</mark>` : esc(v);
  });

const PAGES = [
  { file: 'index.html', title: 'Weekwell', nav: null, landing: true },
  { file: 'privacy.html', title: 'Privacy policy', nav: 'Privacy' },
  { file: 'health-data.html', title: 'Consumer health data privacy policy', nav: 'Health data' },
  { file: 'terms.html', title: 'Terms of use', nav: 'Terms' },
  { file: 'support.html', title: 'Support', nav: 'Support' },
  { file: '404.html', title: 'Page not found', nav: null },
];
const DESCRIPTION = 'Weekwell plans five dinners and work lunches around your store, budget and time, then builds one grocery list.';
const out = join(here, '_dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
copyFileSync(join(here, 'src/style.css'), join(out, 'style.css'));
copyFileSync(join(here, '../apps/mobile/assets/favicon.png'), join(out, 'favicon.png'));
copyFileSync(join(here, '../apps/mobile/assets/icon.png'), join(out, 'icon.png'));
const site = String(config.siteUrl ?? '').replace(/\/$/, '');
for (const page of PAGES) {
  const body = fill(readFileSync(join(here, 'src', page.file), 'utf8'));
  const nav = PAGES.filter((p) => p.nav)
    .map((p) => `<a href="${p.file}"${p.file === page.file ? ' aria-current="page"' : ''}>${p.nav}</a>`)
    .join('');
  const path = page.file === 'index.html' ? '/' : `/${page.file.replace(/\.html$/, '')}`;
  const title = page.title === 'Weekwell' ? 'Weekwell · Five dinners, one grocery list' : `${page.title} · Weekwell`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(DESCRIPTION)}">
${site && page.file !== '404.html' ? `<link rel="canonical" href="${esc(site + path)}">` : ''}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(DESCRIPTION)}">
<meta property="og:type" content="website">
${site ? `<meta property="og:image" content="${esc(site)}/icon.png">` : ''}
<meta name="theme-color" content="#1F5C40">
<link rel="icon" href="/favicon.png">
<link rel="apple-touch-icon" href="/icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Inter:wght@400;600;700&display=swap">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header class="site"><a class="wordmark" href="index.html">Week<em>well</em></a><nav aria-label="Site">${nav}</nav></header>
<main${page.landing ? '' : ' class="doc"'}>
${body}
</main>
<footer><span>© ${new Date().getFullYear()} ${fill('{{company}}')}. Weekwell isn’t affiliated with Trader Joe’s, Walmart, or any other retailer.</span><nav aria-label="Legal">${nav}</nav></footer>
</body>
</html>
`;
  writeFileSync(join(out, page.file), cleanLinks(html).replace(/\n{2,}/g, '\n'));
}
if (site) {
  const urls = PAGES.filter((p) => p.file !== '404.html').map((p) => `<url><loc>${site}${p.file === 'index.html' ? '/' : `/${p.file.replace(/\.html$/, '')}`}</loc></url>`);
  writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>\n`);
  writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`);
}
console.log(`built ${readdirSync(out).length} files into site/_dist${todo.length ? ` (preview: ${todo.length} TODO values marked)` : ''}`);
