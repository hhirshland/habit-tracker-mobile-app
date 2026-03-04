import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  getCustomerInfo,
  hasProEntitlement,
  isTrialing as checkIsTrialing,
  getExpirationDate,
  getProductIdentifier,
} from '@/lib/revenueCat';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionState {
  isActive: boolean;
  isTrialing: boolean;
  expirationDate: string | null;
  productId: string | null;
  hasDiscountAccess: boolean;
}

async function fetchSubscriptionState(userId: string): Promise<SubscriptionState> {
  // Check RevenueCat entitlement first
  try {
    const info = await getCustomerInfo();
    const active = hasProEntitlement(info);
    if (active) {
      return {
        isActive: true,
        isTrialing: checkIsTrialing(info),
        expirationDate: getExpirationDate(info),
        productId: getProductIdentifier(info),
        hasDiscountAccess: false,
      };
    }
  } catch {
    // RevenueCat may not be configured (e.g. web or missing API key)
  }

  // Fall back to Supabase subscription (discount code grants)
  const { data } = await supabase
    .from('subscriptions')
    .select('is_active, status, expiration_date, product_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (data?.is_active) {
    return {
      isActive: true,
      isTrialing: data.status === 'trialing',
      expirationDate: data.expiration_date,
      productId: data.product_id,
      hasDiscountAccess: true,
    };
  }

  return {
    isActive: false,
    isTrialing: false,
    expirationDate: null,
    productId: null,
    hasDiscountAccess: false,
  };
}

export function useSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const appState = useRef(AppState.currentState);

  const query = useQuery({
    queryKey: queryKeys.subscription,
    queryFn: () => fetchSubscriptionState(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

  // Refetch when app returns to foreground (e.g. after completing purchase)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextState === 'active' &&
          user
        ) {
          queryClient.invalidateQueries({ queryKey: queryKeys.subscription });
        }
        appState.current = nextState;
      },
    );
    return () => subscription.remove();
  }, [user, queryClient]);

  return {
    isActive: query.data?.isActive ?? false,
    isTrialing: query.data?.isTrialing ?? false,
    expirationDate: query.data?.expirationDate ?? null,
    productId: query.data?.productId ?? null,
    hasDiscountAccess: query.data?.hasDiscountAccess ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
