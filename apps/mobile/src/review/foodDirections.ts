/**
 * Food-art direction board (design audit 2026-09-24). Review only: nothing in
 * the app uses these until one direction is approved.
 *
 * Direction A, editorial photography: an art-direction spec plus a shot list
 * and a fixed prompt template for generated stills. No photographs are
 * included, because this build has no licensed source. The frames are labelled
 * placeholders.
 *
 * Direction B, a refined illustration system, drawn here for six meals:
 * - a 3/4 view from about 30° above, with one light from the upper left;
 * - the right dish for each meal (bowl, sheet pan, pasta bowl, curry pot,
 *   skillet, board), so meals differ by silhouette as well as colour;
 * - ingredient shapes you can recognise (florets with stems, a salmon fillet
 *   with fat lines, seared meatballs, penne with ridges, chickpeas with seams);
 * - a controlled texture (paper grain) and a warm ink outline on the main
 *   shapes only.
 */

export type Direction = { id: string; recipeId: string; name: string; vessel: string; shot: string; prompt: string; svg: string };

// ---------------------------------------------------------------- utilities
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const f = (n: number) => n.toFixed(1);
type P = { x: number; y: number; a: number; k: number };
/** Points inside an ellipse, spaced apart, sorted back to front. */
function scatter(r: () => number, n: number, cx: number, cy: number, rx: number, ry: number, gap: number): P[] {
  const out: P[] = [];
  let tries = 0;
  while (out.length < n && tries++ < n * 60) {
    const t = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    const p = { x: cx + Math.cos(t) * d * rx, y: cy + Math.sin(t) * d * ry, a: r() * 360, k: 0.85 + r() * 0.3 };
    if (out.every((q) => Math.hypot(q.x - p.x, (q.y - p.y) * 1.8) >= gap)) out.push(p);
  }
  return out.sort((a, b) => a.y - b.y);
}
const INK = '#3B2A1E';
const line = `stroke="${INK}" stroke-width="1.3" stroke-opacity=".55" stroke-linejoin="round" stroke-linecap="round"`;

function frame(id: string, bg: string, cloth: string, body: string): string {
  // Pattern ids are per dish: several drawings share one page on the web.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 240">
<defs>
<pattern id="grain-${id}" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.5" r=".7" fill="#000" opacity=".07"/><circle cx="4.6" cy="4.2" r=".6" fill="#fff" opacity=".12"/><circle cx="5.8" cy="1" r=".4" fill="#000" opacity=".05"/></pattern>
<pattern id="weave-${id}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><rect width="10" height="10" fill="${cloth}"/><path d="M0 5h10M5 0v10" stroke="#fff" stroke-opacity=".35" stroke-width="1"/></pattern>
</defs>
<rect width="360" height="240" fill="${bg}"/>
<path d="M-10 190 L150 150 L260 250 L-10 250Z" fill="url(#weave-${id})"/>
${body}
<rect width="360" height="240" fill="url(#grain-${id})"/>
</svg>`;
}

// ----------------------------------------------------------------- vessels
/** Deep bowl: back rim, body, then the food surface is drawn by the caller, then the front lip. */
function bowl(cx: number, cy: number, rx: number, ry: number, glaze: string, inside: string, food: string): string {
  return `<ellipse cx="${cx + 10}" cy="${cy + ry * 1.25}" rx="${rx * 0.92}" ry="${ry * 0.5}" fill="#000" opacity=".13"/>
<path d="M${cx - rx} ${cy} C${cx - rx} ${cy + ry * 1.9} ${cx + rx} ${cy + ry * 1.9} ${cx + rx} ${cy}Z" fill="${glaze}" ${line}/>
<path d="M${cx - rx * 0.62} ${cy + ry * 1.25} Q${cx} ${cy + ry * 1.5} ${cx + rx * 0.62} ${cy + ry * 1.25}" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="3"/>
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${inside}" ${line}/>
<ellipse cx="${cx}" cy="${cy + 2}" rx="${rx - 7}" ry="${ry - 6}" fill="#000" opacity=".06"/>
${food}
<path d="M${cx - rx} ${cy} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy}" fill="none" stroke="${glaze}" stroke-width="5"/>
<path d="M${cx - rx} ${cy} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy}" fill="none" ${line}/>`;
}

// ----------------------------------------------------------------- pieces
const floret = (p: P, s = 1) => {
  const k = p.k * s;
  const t = `translate(${f(p.x)} ${f(p.y)}) scale(${f(k)})`;
  return `<g transform="${t}"><path d="M-2 10 L-3 2 M2 10 L3 2" stroke="#8DB55E" stroke-width="4" stroke-linecap="round"/>
<g ${line}><circle cx="-6" cy="-2" r="6" fill="#4F7F37"/><circle cx="6" cy="-2" r="6" fill="#4F7F37"/><circle cx="0" cy="-7" r="7" fill="#5B8E40"/></g>
<circle cx="-2" cy="-9" r="2.2" fill="#8DBA62"/><circle cx="4" cy="-5" r="1.6" fill="#8DBA62"/><circle cx="-7" cy="-4" r="1.4" fill="#78A650"/></g>`;
};
const chickenChunk = (p: P) =>
  `<g transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.a % 50 - 25)}) scale(${f(p.k)})"><rect x="-9" y="-6" width="18" height="12" rx="4" fill="#D99A4E" ${line}/><path d="M-7 -2 h14" stroke="#A8662C" stroke-width="2.4" stroke-linecap="round" opacity=".7"/><rect x="-6" y="-5" width="7" height="3" rx="1.5" fill="#F4C987" opacity=".8"/></g>`;
const riceGrains = (r: () => number, cx: number, cy: number, rx: number, ry: number, n: number, c: string) =>
  Array.from({ length: n }, () => {
    const t = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    return `<ellipse cx="${f(cx + Math.cos(t) * d * rx)}" cy="${f(cy + Math.sin(t) * d * ry)}" rx="2.4" ry="1.1" transform="rotate(${f(r() * 180)} ${f(cx + Math.cos(t) * d * rx)} ${f(cy + Math.sin(t) * d * ry)})" fill="${c}"/>`;
  }).join('');
const sesame = (r: () => number, cx: number, cy: number, rx: number, ry: number, n: number) =>
  Array.from({ length: n }, () => `<ellipse cx="${f(cx + (r() - 0.5) * 2 * rx)}" cy="${f(cy + (r() - 0.5) * 2 * ry)}" rx="1.3" ry=".7" fill="#FFF6DF"/>`).join('');
const potatoHalf = (p: P) =>
  `<g transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.a % 60 - 30)}) scale(${f(p.k)})"><ellipse cx="0" cy="2" rx="11" ry="8" fill="#B98A3E" ${line}/><ellipse cx="0" cy="-1" rx="9.5" ry="6" fill="#F1D48C"/><circle cx="-3" cy="-2" r="1.6" fill="#D9A951"/><circle cx="4" cy="0" r="1.2" fill="#D9A951"/></g>`;
const greenBean = (p: P) =>
  `<g transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.a)})"><path d="M-16 0 Q0 -5 16 0" stroke="#4F7F37" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M-14 -1 Q0 -5 14 -1" stroke="#86B25A" stroke-width="2" stroke-linecap="round" fill="none"/></g>`;
const salmon = (x: number, y: number, a: number) =>
  `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M-34 -4 C-30 -18 22 -20 36 -8 C40 0 34 12 20 14 C0 18 -30 14 -34 -4Z" fill="#E9825F" ${line}/>
<path d="M-34 -4 C-30 -18 22 -20 36 -8 C30 -12 -20 -12 -30 -2Z" fill="#B85A3A" opacity=".65"/>
${[-18, -6, 6, 18].map((dx) => `<path d="M${dx} -12 Q${dx + 6} 0 ${dx} 13" stroke="#F8CDB7" stroke-width="2" fill="none" stroke-linecap="round"/>`).join('')}</g>`;
const lemonSlice = (x: number, y: number, r = 11) =>
  `<g transform="translate(${x} ${y}) scale(1 .62)"><circle r="${r}" fill="#F3D352" ${line}/><circle r="${r - 2.5}" fill="#FBEA9A"/>${[0, 60, 120, 180, 240, 300].map((d) => `<path d="M0 0 L${f(Math.cos((d * Math.PI) / 180) * (r - 3))} ${f(Math.sin((d * Math.PI) / 180) * (r - 3))}" stroke="#F3D352" stroke-width="1.4"/>`).join('')}</g>`;
const meatball = (p: P) =>
  `<g transform="translate(${f(p.x)} ${f(p.y)}) scale(${f(p.k)})"><circle r="11" fill="#8A4B2E" ${line}/><circle cx="-3" cy="-4" r="4" fill="#B06C44"/><circle cx="4" cy="3" r="1.6" fill="#5E2E1B"/><circle cx="-5" cy="4" r="1.2" fill="#5E2E1B"/><circle cx="-4" cy="-5" r="1.4" fill="#fff" opacity=".35"/></g>`;
const penne = (p: P) =>
  `<g transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.a)})"><path d="M-11 -4 L9 -5 L11 4 L-9 5Z" fill="#E8B85C" ${line}/><ellipse cx="10" cy="-.5" rx="2" ry="4.6" fill="#C8923A"/>${[-6, -2, 2, 6].map((d) => `<path d="M${d} -4.5 L${d + 1} 4.5" stroke="#CF9D45" stroke-width="1"/>`).join('')}</g>`;
const basil = (x: number, y: number, a: number) =>
  `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M0 0 C6 -8 18 -8 22 0 C18 7 6 7 0 0Z" fill="#3F7A3A" ${line}/><path d="M2 0 H19" stroke="#7FB46B" stroke-width="1.2"/></g>`;
const chickpea = (p: P) =>
  `<g transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.a)}) scale(${f(p.k)})"><circle r="5.6" fill="#E2BC72" ${line}/><path d="M-3 -3 Q0 0 1 5" stroke="#B98C44" stroke-width="1.2" fill="none"/><circle cx="-2" cy="-2.4" r="1.4" fill="#F4DDA6"/></g>`;
const tofuCube = (p: P) =>
  `<g transform="translate(${f(p.x)} ${f(p.y)}) scale(${f(p.k)})"><path d="M-8 -3 L0 -7 L8 -3 L0 1Z" fill="#FBF3DA" ${line}/><path d="M-8 -3 L0 1 L0 9 L-8 5Z" fill="#E6D39F" ${line}/><path d="M8 -3 L0 1 L0 9 L8 5Z" fill="#D8C080" ${line}/></g>`;
const spinachLeaf = (p: P) =>
  `<g transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.a)})"><path d="M0 0 C5 -9 17 -9 20 0 C17 8 5 8 0 0Z" fill="#2F6A34" ${line}/><path d="M1 0 H17" stroke="#5C9A55" stroke-width="1.1"/></g>`;
const pepperStrip = (p: P, c: string, d: string) =>
  `<g transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.a)})"><path d="M-15 2 Q0 -8 15 2" stroke="${d}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M-14 1 Q0 -8 14 1" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-8 -2 Q0 -6 8 -2" stroke="#fff" stroke-opacity=".45" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>`;
const onionSliver = (p: P) =>
  `<g transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.a)})"><path d="M-11 0 Q0 -7 11 0" stroke="#EADCF0" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M-11 0 Q0 -7 11 0" stroke="#9C6BA8" stroke-width="1" fill="none" stroke-linecap="round" transform="translate(0 -1.6)"/></g>`;
const chickenStrip = (p: P) =>
  `<g transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.a)})"><rect x="-13" y="-4" width="26" height="8" rx="4" fill="#CF8D48" ${line}/><path d="M-9 0 h6 M1 0 h7" stroke="#8F5423" stroke-width="2" stroke-linecap="round"/></g>`;
const limeWedge = (x: number, y: number, a: number) =>
  `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M-12 0 A12 12 0 0 0 12 0Z" fill="#7FA635" ${line}/><path d="M-9.5 0 A9.5 9.5 0 0 0 9.5 0Z" fill="#C9E38A"/>${[-50, -90, -130].map((d) => `<path d="M0 0 L${f(Math.cos((-d * Math.PI) / 180) * 8)} ${f(Math.sin((-d * Math.PI) / 180) * 8)}" stroke="#A2C74E" stroke-width="1.2"/>`).join('')}</g>`;
const cucumberCoin = (x: number, y: number) =>
  `<g transform="translate(${x} ${y}) scale(1 .6)"><circle r="9" fill="#5E8E45" ${line}/><circle r="7.4" fill="#CFE6B1"/><circle r="3" fill="#E6F2D5"/>${[0, 72, 144, 216, 288].map((d) => `<circle cx="${f(Math.cos((d * Math.PI) / 180) * 2.2)}" cy="${f(Math.sin((d * Math.PI) / 180) * 2.2)}" r=".7" fill="#9DBF7B"/>`).join('')}</g>`;

// ----------------------------------------------------------------- dishes
function chickenRiceBowl(): string {
  const r = rng('bowl');
  const food =
    `<ellipse cx="180" cy="112" rx="100" ry="46" fill="#F5EFDF"/>` +
    riceGrains(r, 150, 116, 62, 30, 140, '#E2D6BE') +
    scatter(r, 9, 214, 106, 42, 24, 17).map(chickenChunk).join('') +
    scatter(r, 5, 136, 104, 34, 18, 20).map((p) => floret(p, 1.05)).join('') +
    sesame(r, 210, 104, 36, 18, 18) +
    `<path d="M236 96 q10 -4 18 2" stroke="#6E9C4B" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M226 120 q8 -3 14 2" stroke="#6E9C4B" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  return frame('bowl', '#EFE4CF', '#C9D6C3', bowl(180, 112, 110, 54, '#F3EEE3', '#E9E1D0', food));
}

function sheetPanSalmon(): string {
  const r = rng('salmon');
  const pan = `<path d="M70 150 L100 70 L300 70 L312 150Z" fill="#000" opacity=".12" transform="translate(10 12)"/>
<path d="M58 150 L92 62 L306 62 L322 150Z" fill="#A9ADAF" ${line}/>
<path d="M68 144 L98 70 L300 70 L312 144Z" fill="#8E9396"/>
<path d="M76 138 L104 76 L294 76 L302 138Z" fill="#C8C3B6"/>`;
  const food =
    scatter(r, 9, 132, 112, 40, 22, 18).map(potatoHalf).join('') +
    scatter(r, 12, 250, 120, 42, 14, 10).map((p) => greenBean({ ...p, a: 150 + (p.a % 40) })).join('') +
    salmon(196, 96, -6) +
    lemonSlice(240, 92, 10) +
    `<path d="M186 88 l4 -3 M198 86 l3 -4 M210 88 l4 -3" stroke="#3E6B34" stroke-width="2" stroke-linecap="round"/>`;
  return frame('salmon', '#DDE7E1', '#E7D9BE', pan + food);
}

function meatballPasta(): string {
  const r = rng('pasta');
  const food =
    `<ellipse cx="180" cy="110" rx="92" ry="40" fill="#E9C06A"/>` +
    scatter(r, 22, 180, 110, 70, 26, 11).map(penne).join('') +
    `<path d="M120 104 C140 84 220 84 240 104 C224 124 138 126 120 104Z" fill="#B63F2A" opacity=".92"/>` +
    scatter(r, 5, 180, 104, 44, 16, 22).map(meatball).join('') +
    basil(196, 88, -20) +
    basil(156, 96, 200) +
    Array.from({ length: 30 }, () => `<rect x="${f(140 + r() * 80)}" y="${f(90 + r() * 30)}" width="2.2" height="1.4" fill="#FBF1CF"/>`).join('');
  return frame('pasta', '#EFDDD1', '#D9C9A8', bowl(180, 110, 112, 50, '#2F4A5C', '#F3EEE3', food));
}

function tofuCurry(): string {
  const r = rng('curry');
  const food =
    `<ellipse cx="180" cy="112" rx="98" ry="44" fill="#E2A443"/>` +
    `<path d="M120 108 C150 92 190 128 238 104" stroke="#FFF4DC" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>` +
    scatter(r, 10, 170, 112, 70, 30, 12).map(chickpea).join('') +
    scatter(r, 6, 196, 108, 58, 24, 18).map(tofuCube).join('') +
    scatter(r, 5, 150, 110, 60, 26, 20).map(spinachLeaf).join('') +
    `<circle cx="210" cy="96" r="2" fill="#B8452E"/><circle cx="160" cy="124" r="1.6" fill="#B8452E"/><circle cx="224" cy="116" r="1.8" fill="#B8452E"/>`;
  return frame('curry', '#E9E9D2', '#C6B79B', bowl(180, 112, 108, 52, '#6E8F84', '#F1E9D6', food));
}

function fajitaSkillet(): string {
  const r = rng('fajitas');
  const pan = `<ellipse cx="190" cy="138" rx="112" ry="48" fill="#000" opacity=".14"/>
<path d="M290 104 L350 86 Q358 84 356 94 L300 118Z" fill="#2B2B2B" ${line}/>
<ellipse cx="170" cy="118" rx="118" ry="56" fill="#2E2E2E" ${line}/>
<ellipse cx="170" cy="112" rx="104" ry="46" fill="#3E3B38"/>`;
  const food =
    scatter(r, 7, 170, 110, 70, 30, 16).map((p) => pepperStrip(p, '#D9472F', '#A5321F')).join('') +
    scatter(r, 5, 170, 110, 70, 30, 18).map((p) => pepperStrip(p, '#F0B531', '#C88A18')).join('') +
    scatter(r, 4, 170, 110, 70, 30, 20).map((p) => pepperStrip(p, '#5E9A45', '#3F7430')).join('') +
    scatter(r, 6, 170, 110, 64, 26, 16).map(onionSliver).join('') +
    scatter(r, 6, 176, 108, 56, 22, 18).map(chickenStrip).join('') +
    limeWedge(118, 96, -18);
  const tortillas = `<g transform="translate(58 172) rotate(-8)"><path d="M-44 0 A44 30 0 0 1 44 0Z" fill="#EFD9A6" ${line}/><circle cx="-14" cy="-12" r="3" fill="#C99A57" opacity=".6"/><circle cx="10" cy="-18" r="2.4" fill="#C99A57" opacity=".6"/><circle cx="22" cy="-7" r="2" fill="#C99A57" opacity=".6"/></g>`;
  return frame('fajitas', '#EFE4CF', '#D6C2A0', pan + food + tortillas);
}

function yogurtWraps(): string {
  const board = `<path d="M60 196 L96 70 L316 80 L300 206Z" fill="#000" opacity=".12" transform="translate(8 8)"/>
<path d="M56 190 L92 64 L312 74 L296 200Z" fill="#C89A64" ${line}/>
<path d="M70 176 L100 76 M150 186 L170 72 M232 194 L246 76" stroke="#A97B48" stroke-width="1.4" opacity=".6"/>`;
  const half = (x: number, y: number, a: number) =>
    `<g transform="translate(${x} ${y}) rotate(${a})">
<path d="M-40 -8 L40 -14 L44 18 L-36 24Z" fill="#E8D1A0" ${line}/>
<ellipse cx="42" cy="2" rx="12" ry="17" fill="#F2E4C2" ${line}/>
<ellipse cx="42" cy="2" rx="9.5" ry="14.2" fill="#FBF7EC"/>
<circle cx="40" cy="-4" r="3.6" fill="#D99A4E"/><circle cx="45" cy="4" r="3.2" fill="#D99A4E"/><circle cx="39" cy="7" r="2.6" fill="#D99A4E"/>
<path d="M36 -9 q6 -2 11 1 M35 11 q6 3 12 0" stroke="#5E9A45" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<circle cx="47" cy="-3" r="1.4" fill="#D7462F"/>
<path d="M-30 -2 L30 -8" stroke="#D4B57A" stroke-width="1.2" opacity=".7"/></g>`;
  const food = half(160, 118, -6) + half(206, 148, 4) + cucumberCoin(252, 104) + cucumberCoin(270, 114) + cucumberCoin(258, 126) + lemonSlice(112, 150, 9);
  return frame('wraps', '#EFE4CF', '#B9CBD1', board + food);
}

// ------------------------------------------------------------------- board
const STYLE_PROMPT =
  'Editorial food photograph, 3/4 view from about 45 degrees, soft window light from the upper left, matte stoneware on warm natural linen, shallow depth of field focused on the main protein, true-to-recipe portion for one person, no hands, no text, no brand packaging, warm neutral colour grade, 4:3 crop with the dish centred and 10% breathing room.';

export const FOOD_DIRECTIONS: Direction[] = [
  { id: 'rice-bowl', recipeId: 'd_chicken_rice_bowls', name: 'Garlic chicken, rice, and broccoli bowls', vessel: 'Deep bowl', shot: 'Bowl, rice to the left, glazed chicken to the right, broccoli tucked in front; sesame and scallion.', svg: chickenRiceBowl(), prompt: 'Garlic chicken, jasmine rice and broccoli in a deep cream stoneware bowl, glossy garlic glaze, sesame seeds and sliced scallion.' },
  { id: 'sheet-pan-salmon', recipeId: 'd_sheet_pan_salmon', name: 'Sheet-pan salmon with potatoes and green beans', vessel: 'Sheet pan', shot: 'Sheet pan straight from the oven: roasted potato halves, one salmon fillet, green beans, a lemon slice.', svg: sheetPanSalmon(), prompt: 'One roasted salmon fillet with halved baby potatoes and green beans on a lightly used metal sheet pan, lemon slice, dill.' },
  { id: 'meatball-pasta', recipeId: 'd_turkey_meatball_pasta', name: 'Turkey meatballs with marinara pasta', vessel: 'Pasta bowl', shot: 'Wide blue pasta bowl, penne under marinara, five seared meatballs, basil and grated parmesan.', svg: meatballPasta(), prompt: 'Penne with marinara and five seared turkey meatballs in a wide dark-blue pasta bowl, torn basil, finely grated parmesan.' },
  { id: 'tofu-curry', recipeId: 'd_tofu_chickpea_curry', name: 'Tofu and chickpea coconut curry', vessel: 'Curry bowl', shot: 'Golden coconut curry with a cream swirl, tofu cubes and chickpeas, wilted spinach, chilli flakes.', svg: tofuCurry(), prompt: 'Golden tofu and chickpea coconut curry in a sage-green bowl, swirl of coconut milk, wilted spinach, a few chilli flakes.' },
  { id: 'fajitas', recipeId: 'd_chicken_fajitas', name: 'Sheet-pan chicken fajitas', vessel: 'Skillet + tortillas', shot: 'Cast-iron pan of peppers, onions and chicken strips; folded tortillas beside it; a lime wedge.', svg: fajitaSkillet(), prompt: 'Chicken fajita strips with red, yellow and green peppers and red onion in a cast-iron pan, folded flour tortillas beside it, lime wedge.' },
  { id: 'yogurt-wraps', recipeId: 'l_yogurt_chicken_wraps', name: 'Greek yogurt chicken salad wraps', vessel: 'Board (lunch)', shot: 'Two wrap halves cut to show the filling, on a wooden board, cucumber coins and lemon.', svg: yogurtWraps(), prompt: 'Two halves of a Greek yogurt chicken salad wrap cut to show the filling, on a wooden board, cucumber slices, lemon.' },
];

export const PHOTO_SPEC = {
  style: STYLE_PROMPT,
  crops: ['Hero (meal detail, tonight card): 16:9, dish centred, top 10% free for the status bar.', 'Card (week rows): 1:1 crop of the same shot, centred on the main protein.', 'Never mix photos and illustrations in one release.'],
  sourcing: [
    'Commissioned shoot of all 22 recipes: one consistent look, full rights, the most expensive option.',
    'Generated stills with the fixed style prompt above, one per recipe, checked by a person against the actual ingredients; label them as illustrative.',
    'Licensed stock: cheapest to start, but the dishes won’t match the recipes and the look won’t be consistent. Not recommended.',
  ],
};
