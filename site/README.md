# Weekwell site (weekwell.pro)

Static pages built by `node site/build.mjs` into `site/_dist` and deployed by Vercel (D-042).

- Edit text in `site/src/*.html` and settings in `site/site.config.json`.
- Preview locally: `node site/build.mjs && npx serve site/_dist` (clean URLs like `/privacy` work on Vercel; locally use `/privacy.html`).
- Vercel project settings: **Root Directory** is the repo root (blank). Everything else comes from `vercel.json`.
- A push that doesn't touch `site/` or `vercel.json` doesn't redeploy.
