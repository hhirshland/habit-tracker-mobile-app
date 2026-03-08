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

export function configureRevenueCat() {
  const apiKey = Platform.OS === 'ios' ? API_KEY_IOS : API_KEY_ANDROID;
  // #region agent log
  fetch('http://127.0.0.1:7254/ingest/faecd354-d430-4e96-a8a5-e5f3ee5271e0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9afac7'},body:JSON.stringify({sessionId:'9afac7',runId:'initial',hypothesisId:'H2',location:'lib/revenueCat.ts:20',message:'configureRevenueCat invoked',data:{platform:Platform.OS,isConfigured,hasIosKey:Boolean(API_KEY_IOS),hasAndroidKey:Boolean(API_KEY_ANDROID),selectedKeyPresent:Boolean(apiKey),isDev:__DEV__},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (isConfigured || !API_KEY_IOS) {
    // #region agent log
    fetch('http://127.0.0.1:7254/ingest/faecd354-d430-4e96-a8a5-e5f3ee5271e0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9afac7'},body:JSON.stringify({sessionId:'9afac7',runId:'initial',hypothesisId:'H2',location:'lib/revenueCat.ts:25',message:'configureRevenueCat returned early',data:{reason:isConfigured?'already_configured':'missing_ios_key_guard',platform:Platform.OS,selectedKeyPresent:Boolean(apiKey)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return;
  }
  if (!apiKey) {
    // #region agent log
    fetch('http://127.0.0.1:7254/ingest/faecd354-d430-4e96-a8a5-e5f3ee5271e0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9afac7'},body:JSON.stringify({sessionId:'9afac7',runId:'initial',hypothesisId:'H2',location:'lib/revenueCat.ts:31',message:'configureRevenueCat missing selected platform key',data:{platform:Platform.OS,hasIosKey:Boolean(API_KEY_IOS),hasAndroidKey:Boolean(API_KEY_ANDROID)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return;
  }

  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey });
    isConfigured = true;
    // #region agent log
    fetch('http://127.0.0.1:7254/ingest/faecd354-d430-4e96-a8a5-e5f3ee5271e0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9afac7'},body:JSON.stringify({sessionId:'9afac7',runId:'initial',hypothesisId:'H1',location:'lib/revenueCat.ts:41',message:'configureRevenueCat succeeded',data:{platform:Platform.OS,isConfigured},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7254/ingest/faecd354-d430-4e96-a8a5-e5f3ee5271e0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9afac7'},body:JSON.stringify({sessionId:'9afac7',runId:'initial',hypothesisId:'H1',location:'lib/revenueCat.ts:45',message:'configureRevenueCat threw',data:{platform:Platform.OS,error:err instanceof Error?{name:err.name,message:err.message}:String(err)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7254/ingest/faecd354-d430-4e96-a8a5-e5f3ee5271e0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9afac7'},body:JSON.stringify({sessionId:'9afac7',runId:'initial',hypothesisId:'H1',location:'lib/revenueCat.ts:88',message:'fetchOfferings invoked',data:{isConfigured,platform:Platform.OS},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  // #region agent log
  fetch('http://127.0.0.1:7254/ingest/faecd354-d430-4e96-a8a5-e5f3ee5271e0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9afac7'},body:JSON.stringify({sessionId:'9afac7',runId:'initial',hypothesisId:'H3',location:'lib/revenueCat.ts:93',message:'fetchOfferings resolved',data:{currentIdentifier:current?.identifier??null,offeringCount:Object.keys(offerings.all).length,packageTypes:current?.availablePackages.map((pkg)=>pkg.packageType)??[],productIds:current?.availablePackages.map((pkg)=>pkg.product.identifier)??[]},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return current;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}
