/**
 * RevenueCat on the device (D-014). Used only in native builds that have a
 * RevenueCat public SDK key (EXPO_PUBLIC_REVENUECAT_IOS_KEY /
 * EXPO_PUBLIC_REVENUECAT_ANDROID_KEY, set in EAS, never committed). The web
 * preview and tests keep the mock store.
 *
 * On iOS the free week is the App Store introductory offer, so "Start free
 * week" and "Subscribe" are both a purchase of the same package; Apple
 * decides whether the intro offer applies.
 */
import { STORE_PRODUCT_IDS, productIdFromStore, viewFromCustomerInfo, type EntitlementView, type ProductId, type RcCustomerInfo } from '@weekwell/domain';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

const KEY = Platform.select({ ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY, android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY, default: undefined }) ?? '';

export const revenueCatEnabled = Platform.OS !== 'web' && KEY.length > 0;

let configured = false;

/** Call once at launch. `appUserId` is the Weekwell user id when signed in to the API; otherwise RevenueCat uses an anonymous id. */
export function configureRevenueCat(appUserId: string | null) {
  if (!revenueCatEnabled || configured) return;
  if (__DEV__) void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey: KEY, appUserID: appUserId });
  configured = true;
}

export async function rcLogIn(userId: string) {
  if (!configured) return configureRevenueCat(userId);
  await Purchases.logIn(userId);
}

export async function rcLogOut() {
  if (!configured) return;
  // logOut fails for an anonymous user; that's fine, there's nothing to clear.
  await Purchases.logOut().catch(() => undefined);
}

async function introEligible(): Promise<boolean> {
  try {
    // App Store ids, plus the bare ids RevenueCat's Test Store uses (`test_` key).
    const ids = [...Object.values(STORE_PRODUCT_IDS), ...(Object.keys(STORE_PRODUCT_IDS) as ProductId[])];
    const res = await Purchases.checkTrialOrIntroductoryPriceEligibility(ids);
    return ids.some((id) => res[id]?.status === Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE);
  } catch {
    return false;
  }
}

export async function rcView(): Promise<EntitlementView> {
  const [info, eligible] = await Promise.all([Purchases.getCustomerInfo(), introEligible()]);
  return viewFromCustomerInfo(info as unknown as RcCustomerInfo, eligible, new Date());
}

/** Buys the package whose store product matches our product id. */
export async function rcBuy(productId: ProductId): Promise<'ok' | 'cancelled' | 'unavailable' | 'failed'> {
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find((p) => productIdFromStore(p.product.identifier) === productId);
    if (!pkg) return 'unavailable';
    await Purchases.purchasePackage(pkg);
    return 'ok';
  } catch (e) {
    const err = e as { code?: string; userCancelled?: boolean | null };
    if (err.userCancelled || err.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
    return 'failed';
  }
}

/**
 * RevenueCat Customer Center (D-051): cancel, change plan, refund request and restore, configured in
 * the RevenueCat dashboard. Falls back to Apple's own manage sheet if it can't be shown.
 */
export async function rcManage(): Promise<boolean> {
  try {
    await RevenueCatUI.presentCustomerCenter();
    return true;
  } catch {
    try {
      await Purchases.showManageSubscriptions();
      return true;
    } catch {
      return false;
    }
  }
}

export async function rcRestore():Promise<'restored' | 'nothing_to_restore' | 'failed'> {
  try {
    const info = (await Purchases.restorePurchases()) as unknown as RcCustomerInfo;
    const view = viewFromCustomerInfo(info, false, new Date());
    return view.state === 'trial' || view.state === 'active' ? 'restored' : 'nothing_to_restore';
  } catch {
    return 'failed';
  }
}
