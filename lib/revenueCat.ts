import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

const API_KEY_IOS = __DEV__
  ? (process.env.EXPO_PUBLIC_REVENUECAT_IOS_TEST || '')
  : (process.env.EXPO_PUBLIC_REVENUECAT_IOS || '');
const API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID || '';

const PRO_ENTITLEMENT = 'Thrive Pro';
const DEV_PRODUCT_IDS = {
  monthly: 'monthly_v2',
  yearly: 'yearly_v2',
} as const;
const PROD_PRODUCT_IDS = {
  monthly: 'com.hyperactive.thrive.pro.monthly',
  yearly: 'com.hyperactive.thrive.pro.yearly',
} as const;

let isConfigured = false;

export function configureRevenueCat() {
  const apiKey = Platform.OS === 'ios' ? API_KEY_IOS : API_KEY_ANDROID;
  if (isConfigured || !API_KEY_IOS) {
    return;
  }
  if (!apiKey) {
    return;
  }

  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey });
    isConfigured = true;
  } catch (err) {
    console.warn('[RevenueCat] Native module not available:', err);
  }
}

export async function loginRevenueCat(appUserId: string): Promise<CustomerInfo> {
  if (!isConfigured) configureRevenueCat();
  const { customerInfo } = await Purchases.logIn(appUserId);
  return customerInfo;
}

export async function logoutRevenueCat(): Promise<void> {
  if (!isConfigured) return;
  await Purchases.logOut();
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

export function hasProEntitlement(info: CustomerInfo): boolean {
  return info.entitlements.active[PRO_ENTITLEMENT] !== undefined;
}

export function isTrialing(info: CustomerInfo): boolean {
  const entitlement = info.entitlements.active[PRO_ENTITLEMENT];
  if (!entitlement) return false;
  return entitlement.periodType === 'TRIAL';
}

export function getExpirationDate(info: CustomerInfo): string | null {
  const entitlement = info.entitlements.active[PRO_ENTITLEMENT];
  return entitlement?.expirationDate ?? null;
}

export function getProductIdentifier(info: CustomerInfo): string | null {
  const entitlement = info.entitlements.active[PRO_ENTITLEMENT];
  return entitlement?.productIdentifier ?? null;
}

export async function fetchOfferings(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export function getOfferingPackage(
  offering: PurchasesOffering | null | undefined,
  plan: 'monthly' | 'yearly',
): PurchasesPackage | null {
  if (!offering) return null;

  const preferredProductId = __DEV__ ? DEV_PRODUCT_IDS[plan] : PROD_PRODUCT_IDS[plan];
  const preferredPackage = offering.availablePackages.find(
    (pkg) => pkg.product.identifier === preferredProductId,
  );
  if (preferredPackage) return preferredPackage;

  const packageType = plan === 'monthly' ? 'MONTHLY' : 'ANNUAL';
  return offering.availablePackages.find((pkg) => pkg.packageType === packageType) ?? null;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}
