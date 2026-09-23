/**
 * Price service contract (mobile brief: "Retailer and pricing architecture").
 *
 * Rules enforced here:
 * - Only a provider produces a price. Plans and models never do.
 * - Every quote carries source, observed-at, confidence, and scope.
 * - A total is shown only when every priced item has a usable quote.
 *   Otherwise it is withheld (fails closed); it is never a silent partial sum.
 */
import { z } from 'zod';
import { SAMPLE_PACKAGES, SAMPLE_PRICES_WRITTEN_AT, SAMPLE_PRICE_SOURCE } from './fixtures/prices';
import { looksLikeInstruction, sanitizeText } from './sanitize';
import {
  ClaimKindSchema,
  ConfidenceSchema,
  IdSchema,
  LocationScopeSchema,
  MAX_PACKAGE_PRICE_CENTS,
  PriceQuoteSchema,
  RetailerSchema,
  type ClaimKind,
  type GroceryItem,
  type PriceQuote,
  type Retailer,
} from './schemas';

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export type ProductSearchInput = { ingredientId: string };

/** Coarse location only. Never a precise address or coordinates. */
export type LocationHint = { zip3?: string };

export type ProductMatch = {
  retailer: Retailer;
  /** Opaque to the client. Never display it. */
  productRef: string;
  ingredientId: string;
  productName: string;
  packageSize: string;
  packageAmount: number;
};

/** A provider's price for one package. Quantities for the week are applied by buildQuote. */
export const PackagePriceSchema = z
  .object({
    retailer: RetailerSchema,
    productRef: z.string().min(1).max(120),
    ingredientId: IdSchema,
    productName: z.string().min(1).max(200),
    packageSize: z.string().min(1).max(60),
    packageAmount: z.number().positive(),
    priceCents: z.number().int().positive().max(MAX_PACKAGE_PRICE_CENTS),
    currency: z.literal('USD'),
    kind: ClaimKindSchema.exclude(['editorial']),
    observedAt: z.iso.datetime({ offset: true }),
    source: z.string().min(1).max(120),
    confidence: ConfidenceSchema,
    locationScope: LocationScopeSchema,
  })
  .strict();
export type PackagePrice = z.infer<typeof PackagePriceSchema>;

export interface RetailerProvider {
  readonly retailer: Retailer;
  searchProducts(input: ProductSearchInput): Promise<ProductMatch[]>;
  getPrice(productRef: string, location?: LocationHint): Promise<PackagePrice>;
  /** A real deep link, or null. The UI shows "Open store" only for non-null links. */
  getProductDeepLink(productRef: string): Promise<string | null>;
}

export class ProviderUnavailableError extends Error {
  constructor(retailer: Retailer) {
    super(`Price provider for ${retailer} is unavailable`);
    this.name = 'ProviderUnavailableError';
  }
}

// ---------------------------------------------------------------------------
// Fixture provider
// ---------------------------------------------------------------------------

/**
 * - `sample`: default for the pilot. Sample prices, clearly labelled.
 * - `fresh` / `stale` / `expired`: simulate a real estimate feed at different ages.
 * - `verified`: simulate a verified store feed.
 * - `partial`: some products have no price.
 * - `unavailable`: the provider is down.
 * - `bad_data`: provider returns impossible values (zero, negative, extreme).
 */
export const FIXTURE_PRICE_SCENARIOS = [
  'sample',
  'fresh',
  'stale',
  'expired',
  'verified',
  'partial',
  'unavailable',
  'bad_data',
] as const;
export type FixturePriceScenario = (typeof FIXTURE_PRICE_SCENARIOS)[number];

const HOUR = 3_600_000;
const PARTIAL_MISSING = new Set(['salmon', 'greek_yogurt', 'chicken_breast', 'ground_turkey']);

export class FixtureRetailerProvider implements RetailerProvider {
  constructor(
    readonly retailer: Retailer,
    private readonly scenario: FixturePriceScenario = 'sample',
    private readonly now: () => Date = () => new Date(),
  ) {}

  async searchProducts({ ingredientId }: ProductSearchInput): Promise<ProductMatch[]> {
    if (this.scenario === 'unavailable') throw new ProviderUnavailableError(this.retailer);
    const pkg = SAMPLE_PACKAGES[this.retailer].get(ingredientId);
    if (!pkg) return [];
    return [
      {
        retailer: this.retailer,
        productRef: `fixture:${this.retailer}:${ingredientId}`,
        ingredientId,
        productName: pkg.productName,
        packageSize: pkg.packageSize,
        packageAmount: pkg.packageAmount,
      },
    ];
  }

  async getPrice(productRef: string): Promise<PackagePrice> {
    if (this.scenario === 'unavailable') throw new ProviderUnavailableError(this.retailer);
    const ingredientId = productRef.split(':')[2] ?? '';
    const pkg = SAMPLE_PACKAGES[this.retailer].get(ingredientId);
    if (!pkg || (this.scenario === 'partial' && PARTIAL_MISSING.has(ingredientId))) {
      throw new Error(`No price for ${productRef}`);
    }
    const now = this.now().getTime();
    const base = {
      retailer: this.retailer,
      productRef,
      ingredientId,
      productName: pkg.productName,
      packageSize: pkg.packageSize,
      packageAmount: pkg.packageAmount,
      priceCents: pkg.priceCents,
      currency: 'USD' as const,
    };
    switch (this.scenario) {
      case 'sample':
      case 'partial':
        return { ...base, kind: 'estimated', observedAt: SAMPLE_PRICES_WRITTEN_AT, source: SAMPLE_PRICE_SOURCE, confidence: 'low', locationScope: 'sample' };
      case 'fresh':
        return { ...base, kind: 'estimated', observedAt: new Date(now - 2 * HOUR).toISOString(), source: 'Fixture estimate feed (test)', confidence: 'medium', locationScope: 'national' };
      case 'stale':
        return { ...base, kind: 'estimated', observedAt: new Date(now - 3 * 24 * HOUR).toISOString(), source: 'Fixture estimate feed (test)', confidence: 'medium', locationScope: 'national' };
      case 'expired':
        return { ...base, kind: 'estimated', observedAt: new Date(now - 10 * 24 * HOUR).toISOString(), source: 'Fixture estimate feed (test)', confidence: 'medium', locationScope: 'national' };
      case 'verified':
        return { ...base, kind: 'verified', observedAt: new Date(now - 1 * HOUR).toISOString(), source: 'Fixture verified feed (test)', confidence: 'high', locationScope: 'store' };
      case 'bad_data': {
        const bad = [0, -199, 999_999][ingredientId.length % 3] ?? 0;
        return { ...base, priceCents: bad, kind: 'estimated', observedAt: new Date(now - HOUR).toISOString(), source: 'Fixture estimate feed (test)', confidence: 'low', locationScope: 'national' };
      }
    }
  }

  async getProductDeepLink(): Promise<string | null> {
    // No real retailer links exist yet, so "Open store" must not be shown.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Freshness (D-023)
// ---------------------------------------------------------------------------

export const FRESH_FOR_MS = 24 * HOUR;
export const USABLE_FOR_MS = 7 * 24 * HOUR;
const CLOCK_SKEW_MS = 5 * 60_000;

export type Freshness = 'sample' | 'fresh' | 'stale' | 'expired' | 'invalid';

export function evaluateFreshness(quote: Pick<PriceQuote, 'locationScope' | 'unitPrice'>, now: Date): Freshness {
  if (quote.locationScope === 'sample') return 'sample';
  const observed = quote.unitPrice.observedAt ? Date.parse(quote.unitPrice.observedAt) : Number.NaN;
  if (Number.isNaN(observed)) return 'invalid';
  const age = now.getTime() - observed;
  if (age < -CLOCK_SKEW_MS) return 'invalid';
  if (age <= FRESH_FOR_MS) return 'fresh';
  if (age <= USABLE_FOR_MS) return 'stale';
  return 'expired';
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

/** Build a quote for the week's amount. Throws if the provider data is not a valid quote. */
export function buildQuote(pkg: PackagePrice, amountNeeded: number): PriceQuote {
  const parsed = PackagePriceSchema.parse(pkg);
  const quantityNeeded = Math.max(1, Math.ceil(amountNeeded / parsed.packageAmount - 1e-9));
  const meta = {
    kind: parsed.kind,
    observedAt: parsed.observedAt,
    source: sanitizeText(parsed.source, 120),
    confidence: parsed.confidence,
  };
  return PriceQuoteSchema.parse({
    retailer: parsed.retailer,
    ingredientId: parsed.ingredientId,
    // Retailer text is untrusted: plain text only, length-capped.
    productName: sanitizeText(parsed.productName, 80) || 'Product',
    packageSize: sanitizeText(parsed.packageSize, 40) || 'Package',
    packageAmount: parsed.packageAmount,
    unitPrice: { value: parsed.priceCents, ...meta },
    quantityNeeded,
    totalContribution: { value: parsed.priceCents * quantityNeeded, ...meta },
    currency: 'USD',
    locationScope: parsed.locationScope,
  });
}

export type ItemPrice =
  | { status: 'priced'; quote: PriceQuote; freshness: Freshness; flagged: boolean }
  | { status: 'missing'; reason: 'not_found' | 'provider_error' | 'invalid_data' | 'expired' };

export type ShopTotal =
  | {
      status: 'available';
      totalCents: number;
      kind: Exclude<ClaimKind, 'editorial'>;
      isSample: boolean;
      /** Oldest observation among quotes, used for "Checked 2 hours ago". */
      oldestObservedAt: string;
      staleItemIds: string[];
      itemCount: number;
    }
  | {
      status: 'withheld';
      reason: 'provider_unavailable' | 'missing_prices';
      missingItemIds: string[];
      itemCount: number;
    };

export type PricedList = {
  retailer: Retailer;
  items: Map<string, ItemPrice>;
  total: ShopTotal;
  checkedAt: string;
};

export type PriceListOptions = {
  now?: Date;
  timeoutMs?: number;
  location?: LocationHint;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

/** Price every non-staple grocery item and compute a total that fails closed. */
export async function priceGroceryList(
  provider: RetailerProvider,
  items: readonly GroceryItem[],
  options: PriceListOptions = {},
): Promise<PricedList> {
  const now = options.now ?? new Date();
  const timeoutMs = options.timeoutMs ?? 8_000;
  const priceable = items.filter((i) => !i.staple);
  const results = new Map<string, ItemPrice>();
  let providerDown = false;

  await Promise.all(
    priceable.map(async (item) => {
      try {
        const matches = await withTimeout(provider.searchProducts({ ingredientId: item.ingredientId }), timeoutMs);
        const match = matches[0];
        if (!match) {
          results.set(item.id, { status: 'missing', reason: 'not_found' });
          return;
        }
        const pkg = await withTimeout(provider.getPrice(match.productRef, options.location), timeoutMs);
        let quote: PriceQuote;
        try {
          if (pkg.ingredientId !== item.ingredientId || pkg.retailer !== provider.retailer) throw new Error('mismatch');
          quote = buildQuote(pkg, item.amount);
        } catch {
          results.set(item.id, { status: 'missing', reason: 'invalid_data' });
          return;
        }
        const freshness = evaluateFreshness(quote, now);
        if (freshness === 'expired' || freshness === 'invalid') {
          results.set(item.id, { status: 'missing', reason: freshness === 'expired' ? 'expired' : 'invalid_data' });
          return;
        }
        results.set(item.id, { status: 'priced', quote, freshness, flagged: looksLikeInstruction(pkg.productName) });
      } catch (error) {
        if (error instanceof ProviderUnavailableError || (error instanceof Error && error.message === 'timeout')) {
          providerDown = true;
        }
        results.set(item.id, { status: 'missing', reason: 'provider_error' });
      }
    }),
  );

  return {
    retailer: provider.retailer,
    items: results,
    total: computeShopTotal(priceable.map((i) => i.id), results, providerDown),
    checkedAt: now.toISOString(),
  };
}

export function computeShopTotal(itemIds: readonly string[], prices: ReadonlyMap<string, ItemPrice>, providerDown = false): ShopTotal {
  const missing = itemIds.filter((id) => prices.get(id)?.status !== 'priced');
  if (missing.length > 0 || itemIds.length === 0) {
    return {
      status: 'withheld',
      reason: providerDown && missing.length === itemIds.length ? 'provider_unavailable' : 'missing_prices',
      missingItemIds: missing,
      itemCount: itemIds.length,
    };
  }
  let total = 0;
  let allVerified = true;
  let isSample = false;
  let oldest = Number.POSITIVE_INFINITY;
  let oldestIso = '';
  const stale: string[] = [];
  for (const id of itemIds) {
    const p = prices.get(id);
    if (p?.status !== 'priced') continue;
    total += p.quote.totalContribution.value;
    if (p.quote.unitPrice.kind !== 'verified') allVerified = false;
    if (p.freshness === 'sample') isSample = true;
    if (p.freshness === 'stale') stale.push(id);
    const t = Date.parse(p.quote.unitPrice.observedAt ?? '');
    if (t < oldest) {
      oldest = t;
      oldestIso = p.quote.unitPrice.observedAt ?? '';
    }
  }
  return {
    status: 'available',
    totalCents: total,
    // One estimated line makes the whole total an estimate.
    kind: allVerified && !isSample ? 'verified' : 'estimated',
    isSample,
    oldestObservedAt: oldestIso,
    staleItemIds: stale,
    itemCount: itemIds.length,
  };
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

export type BudgetStatus =
  | { state: 'unknown' }
  | { state: 'under'; remainingCents: number }
  | { state: 'over'; overCents: number };

export function budgetStatus(total: ShopTotal, weeklyBudgetDollars: number): BudgetStatus {
  if (total.status !== 'available') return { state: 'unknown' };
  const budgetCents = weeklyBudgetDollars * 100;
  if (total.totalCents <= budgetCents) return { state: 'under', remainingCents: budgetCents - total.totalCents };
  return { state: 'over', overCents: total.totalCents - budgetCents };
}

/**
 * Synchronous sample cost for planning decisions only (choosing cheaper meals).
 * This value is never displayed; displayed prices come from a provider.
 */
export function sampleCostCents(retailer: Retailer, ingredientId: string, amount: number): number {
  const pkg = SAMPLE_PACKAGES[retailer].get(ingredientId);
  if (!pkg) return 0;
  return Math.ceil(amount / pkg.packageAmount - 1e-9) * pkg.priceCents;
}
