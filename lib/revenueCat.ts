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

let isConfigured = false;

export function getRevenueCatDiagnostics() {
  const apiKey = Platform.OS === 'ios' ? API_KEY_IOS : API_KEY_ANDROID;
  const masked = apiKey
    ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`
    : 'EMPTY';
  return { isConfigured, apiKeyMasked: masked, isDev: __DEV__ };
}

export function configureRevenueCat() {
  if (isConfigured || !API_KEY_IOS) return;

  const apiKey = Platform.OS === 'ios' ? API_KEY_IOS : API_KEY_ANDROID;
  if (!apiKey) return;

  try {
    // TEMP: use DEBUG in prod to aid TestFlight diagnosis
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
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

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}
