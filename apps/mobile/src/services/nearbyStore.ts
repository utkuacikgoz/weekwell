/**
 * "Use my location" (D-047): finds the nearest Trader Joe's or Walmart with
 * Apple Maps search on the phone. Asks for location only while the app is in
 * use, once, when the person taps. Only the chosen store is saved; the
 * person's own location is never stored or sent to Weekwell.
 */
import { RETAILERS, type Retailer } from '@weekwell/domain';
import * as Location from 'expo-location';
import { StoreSearch, type RawStore } from '../../modules/store-search';
import type { NearbyScenario } from './scenarios';

export type HomeStore = { retailer: Retailer; name: string; street: string; city: string; latitude: number; longitude: number; miles: number };
export type NearbyResult = { status: 'found'; store: HomeStore } | { status: 'denied' | 'none' | 'failed' };

const QUERY: Record<Retailer, string> = { trader_joes: 'Trader Joe’s', walmart: 'Walmart' };
const MATCH: Record<Retailer, RegExp> = { trader_joes: /trader\s*joe/iu, walmart: /walmart/iu };
/** About 25 miles: far enough for rural Walmarts, near enough to be "your" store. */
const RADIUS_METERS = 40_000;
const METERS_PER_MILE = 1609.344;

/** True where the search can run: iOS builds with the module, or a web test scenario. */
export function nearbyAvailable(scenario?: NearbyScenario): boolean {
  return scenario !== undefined || StoreSearch !== null;
}

/** Sample results for the web preview and tests (`?nearby=found`). */
const SAMPLE: Record<Retailer, RawStore> = {
  trader_joes: { name: 'Trader Joe’s', street: '1820 Market St', city: 'Springfield', latitude: 0, longitude: 0, distanceMeters: 2_897 },
  walmart: { name: 'Walmart Supercenter', street: '4500 Main St', city: 'Springfield', latitude: 0, longitude: 0, distanceMeters: 1_931 },
};

function toStore(retailer: Retailer, s: RawStore): HomeStore {
  return { retailer, name: s.name, street: s.street, city: s.city, latitude: s.latitude, longitude: s.longitude, miles: Math.round((s.distanceMeters / METERS_PER_MILE) * 10) / 10 };
}

/** The nearest store among `retailers` (both when the person hasn't picked one yet). */
export async function findNearestStore(retailers: readonly Retailer[] = RETAILERS, scenario?: NearbyScenario): Promise<NearbyResult> {
  if (scenario === 'denied' || scenario === 'none') return { status: scenario };
  if (scenario === 'found') {
    const best = retailers.map((r) => toStore(r, SAMPLE[r])).sort((a, b) => a.miles - b.miles)[0];
    return best ? { status: 'found', store: best } : { status: 'none' };
  }
  if (!StoreSearch) return { status: 'failed' };
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
    const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = here.coords;
    const found: HomeStore[] = [];
    for (const retailer of retailers) {
      const results = await StoreSearch.searchAsync(QUERY[retailer], latitude, longitude, RADIUS_METERS);
      for (const r of results) if (MATCH[retailer].test(r.name)) found.push(toStore(retailer, r));
    }
    found.sort((a, b) => a.miles - b.miles);
    return found[0] ? { status: 'found', store: found[0] } : { status: 'none' };
  } catch {
    return { status: 'failed' };
  }
}

export function formatMiles(miles: number): string {
  return miles < 0.2 ? 'nearby' : `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
}

/** "Walmart Supercenter on Main St" or just the name. */
export function storeLabel(s: HomeStore): string {
  const street = s.street.replace(/^\d+\s+/u, '');
  return street ? `${s.name} on ${street}` : s.name;
}

/** Apple Maps directions (opens the Maps app on iPhone, maps.apple.com elsewhere). */
export function directionsUrl(s: HomeStore): string {
  const q = encodeURIComponent(`${s.name}, ${s.street}, ${s.city}`);
  return s.latitude || s.longitude ? `https://maps.apple.com/?daddr=${s.latitude},${s.longitude}&q=${q}` : `https://maps.apple.com/?daddr=${q}`;
}
