/**
 * Meal illustration drawn from the recipe's actual ingredients: a top-down
 * plate in one consistent style (same crop, same light, flat color, no text).
 * It is a designed stand-in until approved food photography exists (D-028);
 * it never pretends to be a photo.
 */
import { memo, type ReactElement } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { scheme } from '../theme/tokens';

type Shape =
  | 'chunks' | 'crumbles' | 'slices' | 'fillet' | 'shrimp' | 'coins' | 'rolls' | 'cubes' | 'eggs' | 'flakes' | 'beans' | 'dollop'
  | 'florets' | 'mixed' | 'sticks' | 'leaves' | 'strips' | 'tomatoes' | 'pods' | 'shreds' | 'wedge' | 'sprinkle' | 'penne';

type Topping = { role: 'protein' | 'veg' | 'accent'; shape: Shape; color: string; shade: string };

type Art =
  | { role: 'sauce'; color: string }
  | { role: 'grain'; color: string; texture: string; shape?: 'penne' }
  | { role: 'wrap'; color: string; edge: string }
  | { role: 'protein' | 'veg' | 'accent'; shape: Shape; color: string; shade: string };

const ART: Record<string, Art> = {
  coconut_milk: { role: 'sauce', color: '#E2AA4E' },
  marinara: { role: 'sauce', color: '#B8452E' },
  diced_tomatoes: { role: 'sauce', color: '#A9432C' },
  jasmine_rice: { role: 'grain', color: '#F7F2E7', texture: '#E4DAC6' },
  frozen_brown_rice: { role: 'grain', color: '#DCC7A0', texture: '#C4AB7E' },
  quinoa: { role: 'grain', color: '#E8D6A8', texture: '#CDB67E' },
  pasta: { role: 'grain', color: '#EAC474', texture: '#D2A650', shape: 'penne' },
  flour_tortillas: { role: 'wrap', color: '#F0DCAE', edge: '#D9B97A' },
  corn_tortillas: { role: 'wrap', color: '#E9C66E', edge: '#CFA64A' },
  whole_wheat_pita: { role: 'wrap', color: '#D3AD70', edge: '#B38C4E' },
  butter_lettuce: { role: 'wrap', color: '#AFCF84', edge: '#86AD5E' },
  chicken_breast: { role: 'protein', shape: 'chunks', color: '#DDA662', shade: '#B97B3B' },
  chicken_thigh: { role: 'protein', shape: 'slices', color: '#D49452', shade: '#A96A30' },
  ground_turkey: { role: 'protein', shape: 'crumbles', color: '#BC8759', shade: '#94643C' },
  ground_beef: { role: 'protein', shape: 'crumbles', color: '#7F4B34', shade: '#5E3322' },
  sirloin: { role: 'protein', shape: 'slices', color: '#8E4B37', shade: '#C46B5B' },
  salmon: { role: 'protein', shape: 'fillet', color: '#EA8E6C', shade: '#F7CDB9' },
  shrimp: { role: 'protein', shape: 'shrimp', color: '#F1A27C', shade: '#D9774F' },
  chicken_sausage: { role: 'protein', shape: 'coins', color: '#C88A5C', shade: '#A5673C' },
  deli_turkey: { role: 'protein', shape: 'rolls', color: '#E8C1A6', shade: '#CF9E80' },
  tofu: { role: 'protein', shape: 'cubes', color: '#F2E5C3', shade: '#DEC897' },
  eggs: { role: 'protein', shape: 'eggs', color: '#FFFDF7', shade: '#F1B43A' },
  canned_tuna: { role: 'protein', shape: 'flakes', color: '#D2B4A2', shade: '#B8937F' },
  chickpeas: { role: 'protein', shape: 'beans', color: '#DEBA79', shade: '#C39D5A' },
  black_beans: { role: 'veg', shape: 'beans', color: '#3C312C', shade: '#221B18' },
  cannellini: { role: 'protein', shape: 'beans', color: '#F0E7D4', shade: '#D8CBB0' },
  hummus: { role: 'accent', shape: 'dollop', color: '#DAB98A', shade: '#BF9A66' },
  broccoli: { role: 'veg', shape: 'florets', color: '#5E8B44', shade: '#476D31' },
  frozen_stirfry_veg: { role: 'veg', shape: 'mixed', color: '#5E8B44', shade: '#E4843B' },
  green_beans: { role: 'veg', shape: 'sticks', color: '#6E9C4B', shade: '#557D37' },
  spinach: { role: 'veg', shape: 'leaves', color: '#3F6E3B', shade: '#2F5A2C' },
  bell_pepper: { role: 'veg', shape: 'strips', color: '#D5533A', shade: '#E9B63D' },
  onion: { role: 'veg', shape: 'strips', color: '#EDE0CC', shade: '#D8C6A9' },
  cherry_tomatoes: { role: 'veg', shape: 'tomatoes', color: '#D7462F', shade: '#F08A74' },
  cucumber: { role: 'veg', shape: 'coins', color: '#B8D69B', shade: '#6E9A55' },
  frozen_edamame: { role: 'veg', shape: 'pods', color: '#8FB65A', shade: '#6F9540' },
  baby_potatoes: { role: 'veg', shape: 'chunks', color: '#DFB86F', shade: '#BF9446' },
  sweet_potato: { role: 'veg', shape: 'cubes', color: '#E58A3D', shade: '#C46D26' },
  carrots: { role: 'veg', shape: 'shreds', color: '#E8853B', shade: '#C96A25' },
  lemon: { role: 'accent', shape: 'wedge', color: '#F3D352', shade: '#E5BD2E' },
  lime: { role: 'accent', shape: 'wedge', color: '#A2C74E', shade: '#7FA635' },
  feta: { role: 'accent', shape: 'cubes', color: '#FBF8EF', shade: '#E7E0CF' },
  parmesan: { role: 'accent', shape: 'sprinkle', color: '#F2E3B8', shade: '#DCC68C' },
  greek_yogurt: { role: 'accent', shape: 'dollop', color: '#FCFBF6', shade: '#E7E2D5' },
  salsa: { role: 'accent', shape: 'dollop', color: '#C94A32', shade: '#A53A25' },
};

/** Soft tile tints, chosen by the main protein family so a week reads as varied but coherent. */
const TILE: Record<string, string> =
  scheme === 'dark'
    ? { poultry: '#3A3226', red: '#3C2B25', sea: '#243431', plant: '#2F3225' }
    : { poultry: '#EFE4CF', red: '#EFDDD1', sea: '#DDE7E1', plant: '#E9E9D2' };
const FAMILY: Record<string, keyof typeof TILE> = {
  chicken_breast: 'poultry', chicken_thigh: 'poultry', ground_turkey: 'poultry', chicken_sausage: 'poultry', deli_turkey: 'poultry',
  ground_beef: 'red', sirloin: 'red',
  salmon: 'sea', shrimp: 'sea', canned_tuna: 'sea',
  tofu: 'plant', eggs: 'plant', chickpeas: 'plant', cannellini: 'plant',
};

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

type Pt = { x: number; y: number; r: number };

/** Points scattered in a disk with a minimum spacing, deterministic per seed. */
function cluster(rand: () => number, n: number, cx: number, cy: number, radius: number, minGap: number): Pt[] {
  const out: Pt[] = [];
  let tries = 0;
  while (out.length < n && tries < n * 40) {
    tries++;
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * radius;
    const p = { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: rand() * 360 };
    if (out.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= minGap)) out.push(p);
  }
  return out;
}

function piece(shape: Shape, p: Pt, c: string, s: string, key: string, scale = 1): ReactElement {
  const t = `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.r.toFixed(0)}) scale(${scale})`;
  switch (shape) {
    case 'chunks':
      return (
        <G key={key} transform={t}>
          <Rect x={-5.5} y={-4} width={11} height={8} rx={3} fill={c} />
          <Rect x={-4} y={-1} width={8} height={2} rx={1} fill={s} opacity={0.55} />
        </G>
      );
    case 'slices':
      return (
        <G key={key} transform={t}>
          <Path d="M-8 -3 Q0 -6 8 -3 L7 3 Q0 1 -7 3 Z" fill={c} />
          <Path d="M-6 -1 Q0 -3 6 -1" stroke={s} strokeWidth={1.2} fill="none" opacity={0.7} />
        </G>
      );
    case 'crumbles':
      return (
        <G key={key} transform={t}>
          <Circle cx={-2.5} cy={-1} r={2.6} fill={c} />
          <Circle cx={2} cy={-2} r={2.2} fill={s} />
          <Circle cx={0.5} cy={2.2} r={2.4} fill={c} />
          <Circle cx={3.8} cy={1.8} r={1.6} fill={c} />
        </G>
      );
    case 'fillet':
      return (
        <G key={key} transform={t}>
          <Rect x={-10} y={-6} width={20} height={12} rx={4} fill={c} />
          {[-5, 0, 5].map((x) => (
            <Path key={x} d={`M${x - 2} -5 Q${x + 1} 0 ${x - 2} 5`} stroke={s} strokeWidth={1.3} fill="none" />
          ))}
        </G>
      );
    case 'shrimp':
      return (
        <G key={key} transform={t}>
          <Path d="M4 -4 A5 5 0 1 0 5 3" stroke={c} strokeWidth={4} strokeLinecap="round" fill="none" />
          <Path d="M4 -4 A5 5 0 1 0 5 3" stroke={s} strokeWidth={0.8} strokeDasharray="1.5 2" fill="none" />
        </G>
      );
    case 'coins':
      return (
        <G key={key} transform={t}>
          <Circle r={4.2} fill={s} />
          <Circle r={3.3} fill={c} />
          <Circle cx={-1} cy={-1} r={1.1} fill="#fff" opacity={0.18} />
        </G>
      );
    case 'rolls':
      return (
        <G key={key} transform={t}>
          <Rect x={-7} y={-3} width={14} height={6} rx={3} fill={c} />
          <Path d="M-4 -3 L-4 3 M1 -3 L1 3" stroke={s} strokeWidth={0.8} />
        </G>
      );
    case 'cubes':
      return (
        <G key={key} transform={t}>
          <Rect x={-3.6} y={-3.6} width={7.2} height={7.2} rx={1.4} fill={c} />
          <Path d="M-3.6 1.8 H3.6" stroke={s} strokeWidth={1.4} opacity={0.6} />
        </G>
      );
    case 'eggs':
      return (
        <G key={key} transform={t}>
          <Path d="M-7 0 Q-7 -6 0 -6 Q7 -6 7 0 Q7 6 0 6 Q-7 6 -7 0 Z" fill={c} />
          <Circle cx={0.5} cy={0} r={3.2} fill={s} />
        </G>
      );
    case 'flakes':
      return (
        <G key={key} transform={t}>
          <Path d="M-5 -2 L-1 -4 L4 -2 L5 2 L0 4 L-4 3 Z" fill={c} />
          <Path d="M-2 -2 L2 2" stroke={s} strokeWidth={0.8} />
        </G>
      );
    case 'beans':
      return (
        <G key={key} transform={t}>
          <Ellipse cx={-2.2} cy={0} rx={2.2} ry={1.5} fill={c} />
          <Ellipse cx={2.3} cy={1} rx={2.2} ry={1.5} fill={c} />
          <Ellipse cx={0.4} cy={-2.4} rx={2.2} ry={1.5} fill={s} />
        </G>
      );
    case 'dollop':
      return (
        <G key={key} transform={t}>
          <Circle r={6.2} fill={s} />
          <Circle r={5.2} fill={c} />
          <Path d="M-2 -1 Q0 -3 2 -1" stroke={s} strokeWidth={0.9} fill="none" />
        </G>
      );
    case 'florets':
      return (
        <G key={key} transform={t}>
          <Rect x={-1} y={1} width={2.2} height={4.5} rx={1} fill="#8DB067" />
          <Circle cx={-2.6} cy={-0.5} r={2.8} fill={c} />
          <Circle cx={2.4} cy={-0.8} r={2.7} fill={c} />
          <Circle cx={0} cy={-3} r={2.9} fill={s} />
        </G>
      );
    case 'mixed':
      return (
        <G key={key} transform={t}>
          <Circle cx={-2} cy={-1} r={2.6} fill={c} />
          <Rect x={0.5} y={-3} width={5} height={2.2} rx={1} fill={s} />
          <Rect x={-1} y={1.5} width={5} height={2} rx={1} fill="#D5533A" />
        </G>
      );
    case 'sticks':
      return (
        <G key={key} transform={t}>
          <Rect x={-7} y={-3} width={14} height={2.2} rx={1.1} fill={c} />
          <Rect x={-6} y={0.8} width={13} height={2.2} rx={1.1} fill={s} />
        </G>
      );
    case 'leaves':
      return (
        <G key={key} transform={t}>
          <Path d="M-6 0 Q0 -6 6 0 Q0 6 -6 0 Z" fill={c} />
          <Path d="M-5 0 H5" stroke={s} strokeWidth={0.7} />
        </G>
      );
    case 'strips':
      return (
        <G key={key} transform={t}>
          <Path d="M-6 -2 Q0 -4 6 -2" stroke={c} strokeWidth={2.4} strokeLinecap="round" fill="none" />
          <Path d="M-5 2 Q1 0 6 2" stroke={s} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        </G>
      );
    case 'tomatoes':
      return (
        <G key={key} transform={t}>
          <Circle r={3.6} fill={c} />
          <Circle cx={-1.1} cy={-1.1} r={1} fill={s} />
        </G>
      );
    case 'pods':
      return (
        <G key={key} transform={t}>
          <Ellipse cx={-1.6} cy={0} rx={1.8} ry={1.5} fill={c} />
          <Ellipse cx={1.6} cy={0.4} rx={1.8} ry={1.5} fill={s} />
        </G>
      );
    case 'shreds':
      return (
        <G key={key} transform={t}>
          <Path d="M-5 -1 L5 -2 M-4 1.5 L5 0.5" stroke={c} strokeWidth={1.3} strokeLinecap="round" />
        </G>
      );
    case 'wedge':
      return (
        <G key={key} transform={t}>
          <Path d="M-6 0 A6 6 0 0 1 6 0 Z" fill={s} />
          <Path d="M-4.8 -0.4 A4.8 4.8 0 0 1 4.8 -0.4 Z" fill={c} />
        </G>
      );
    case 'sprinkle':
      return (
        <G key={key} transform={t}>
          {[[-3, -1], [0, 2], [2.5, -2], [-1, -3], [3, 1.5]].map(([x, y], i) => (
            <Rect key={i} x={x} y={y} width={1.4} height={1} fill={c} />
          ))}
        </G>
      );
    case 'penne':
      return (
        <G key={key} transform={t}>
          <Rect x={-4} y={-1.6} width={8} height={3.2} rx={0.8} fill={c} />
          <Path d="M-2 -1.6 L-3 1.6 M1 -1.6 L0 1.6" stroke={s} strokeWidth={0.6} />
        </G>
      );
  }
}

function Plate({ recipeId, ingredientIds }: { recipeId: string; ingredientIds: readonly string[] }) {
  const rand = rng(recipeId);
  const arts = ingredientIds.map((id) => ART[id]).filter((a): a is Art => !!a);
  const sauce = arts.find((a): a is Extract<Art, { role: 'sauce' }> => a.role === 'sauce');
  const grain = arts.find((a): a is Extract<Art, { role: 'grain' }> => a.role === 'grain');
  const wraps = arts.filter((a): a is Extract<Art, { role: 'wrap' }> => a.role === 'wrap');
  const toppings = (role: Topping['role']) => arts.filter((a): a is Topping => a.role === role);
  const proteins = toppings('protein');
  const veg = toppings('veg');
  const accents = toppings('accent');
  const layers: ReactElement[] = [];
  const S = 1.45; // piece scale

  // Zones depend on what forms the base of the plate.
  let proteinAt = { x: 42, y: 42, r: 15 };
  let vegAt = { x: 62, y: 62, r: 15 };

  if (sauce) {
    layers.push(<Circle key="sauce" cx={50} cy={50} r={35} fill={sauce.color} />);
    layers.push(<Circle key="sauce-hl" cx={44} cy={43} r={20} fill="#fff" opacity={0.08} />);
    proteinAt = { x: 56, y: 50, r: 20 };
    vegAt = { x: 50, y: 52, r: 26 };
  }
  if (grain) {
    const mound = sauce ? { x: 34, y: 38, r: 15 } : { x: 36, y: 52, r: 22 };
    if (grain.shape === 'penne') {
      cluster(rand, 14, 50, 50, 28, 6).forEach((p, i) => layers.push(piece('penne', p, grain.color, grain.texture, `pn${i}`, S)));
    } else {
      layers.push(<Circle key="grain-shadow" cx={mound.x + 1} cy={mound.y + 1.2} r={mound.r} fill="#000" opacity={0.06} />);
      layers.push(<Circle key="grain" cx={mound.x} cy={mound.y} r={mound.r} fill={grain.color} stroke={grain.texture} strokeWidth={0.8} />);
      cluster(rand, Math.round(mound.r * 1.4), mound.x, mound.y, mound.r - 2.5, 2.4).forEach((p, i) =>
        layers.push(<Ellipse key={`gt${i}`} cx={p.x} cy={p.y} rx={1.4} ry={0.7} fill={grain.texture} transform={`rotate(${p.r.toFixed(0)} ${p.x.toFixed(1)} ${p.y.toFixed(1)})`} />),
      );
      if (!sauce) {
        proteinAt = { x: 66, y: 38, r: 12 };
        vegAt = { x: 64, y: 67, r: 12 };
      }
    }
  }
  if (!grain && wraps.length > 0) {
    wraps.slice(0, 1).forEach((w) => {
      [
        { x: 38, y: 40 },
        { x: 44, y: 62 },
      ].forEach((c, i) => {
        layers.push(<Ellipse key={`w${i}`} cx={c.x} cy={c.y} rx={19} ry={15} fill={w.color} stroke={w.edge} strokeWidth={1.2} transform={`rotate(${i ? 20 : -15} ${c.x} ${c.y})`} />);
      });
    });
    proteinAt = { x: 42, y: 46, r: 13 };
    vegAt = { x: 64, y: 58, r: 13 };
  } else if (wraps.length > 0) {
    // A wrap alongside a grain (e.g. tortillas with rice): fold it at the plate edge.
    const w = wraps[0]!;
    layers.push(<Path key="wrap-fold" d="M60 18 A20 20 0 0 1 84 44 Z" fill={w.color} stroke={w.edge} strokeWidth={1.2} />);
  }
  // A bed of leafy greens goes under everything else when there is no grain or sauce.
  const bed = veg.find((v) => v.shape === 'leaves');
  if (bed && !grain && !sauce) {
    cluster(rand, 11, 50, 50, 26, 8).forEach((p, i) => layers.push(piece('leaves', p, bed.color, bed.shade, `bed${i}`, S * 1.2)));
  }

  proteins.forEach((pr, i) => {
    const n = pr.shape === 'fillet' ? 1 : pr.shape === 'eggs' ? 2 : i === 0 ? 5 : 3;
    const zone = i === 0 ? proteinAt : { x: proteinAt.x + 6, y: proteinAt.y + 10, r: proteinAt.r * 0.7 };
    const pts = n === 1 ? [{ x: zone.x, y: zone.y, r: -18 }] : cluster(rand, n, zone.x, zone.y, zone.r, 8);
    pts.forEach((p, j) => layers.push(piece(pr.shape, p, pr.color, pr.shade, `p${i}${j}`, n === 1 ? S * 1.25 : S)));
  });
  veg
    .filter((v) => !(v === bed && !grain && !sauce))
    .forEach((v, i) => {
      const zone = { x: vegAt.x + (i % 2 ? 5 : -3), y: vegAt.y + (i > 1 ? -6 : 3), r: vegAt.r };
      cluster(rand, i === 0 ? 5 : 3, zone.x, zone.y, zone.r, 7.5).forEach((p, j) => layers.push(piece(v.shape, p, v.color, v.shade, `v${i}${j}`, S)));
    });
  accents.slice(0, 2).forEach((a, i) => {
    if (a.shape === 'cubes' || a.shape === 'sprinkle') {
      cluster(rand, 5, 52, 48, 20, 7).forEach((p, j) => layers.push(piece(a.shape, p, a.color, a.shade, `a${i}${j}`, S * 0.9)));
    } else {
      const p = i === 0 ? { x: 80, y: 62, r: -30 } : { x: 48, y: 22, r: 12 };
      layers.push(piece(a.shape, p, a.color, a.shade, `a${i}`, S));
    }
  });

  return (
    <G>
      {/* One light source, top-left: soft shadow lower right. */}
      <Circle cx={52} cy={53.5} r={46} fill="#000" opacity={0.08} />
      <Circle cx={50} cy={50} r={46} fill="#FCFAF5" />
      <Circle cx={50} cy={50} r={40} fill="none" stroke="#E9E0D0" strokeWidth={1.2} />
      {layers}
    </G>
  );
}

export type MealArtProps = { recipeId: string; ingredientIds: readonly string[]; width: number; height?: number; radius?: number; /** false: no tile colour (icon foreground, splash). */ tile?: boolean };

function tileFor(ingredientIds: readonly string[]): string {
  for (const id of ingredientIds) {
    const f = FAMILY[id];
    if (f) return TILE[f] as string;
  }
  return TILE.plant as string;
}

/** Square thumbnail, or a wide banner when `height` is smaller than `width`. */
export const MealArt = memo(function MealArt({ recipeId, ingredientIds, width, height = width, radius = 12, tile = true }: MealArtProps) {
  const wide = width > height;
  return (
    <View
      style={{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: tile ? tileFor(ingredientIds) : 'transparent' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Thumbnails show the whole plate; the wide banner crops in for an editorial, food-first view. */}
      <Svg width={width} height={height} viewBox={wide ? `${50 - (70 * width) / height / 2} 15 ${(70 * width) / height} 70` : '-1 -1 104 104'}>
        <Plate recipeId={recipeId} ingredientIds={ingredientIds} />
      </Svg>
    </View>
  );
});
