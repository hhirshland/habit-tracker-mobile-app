import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { PurchasesPackage } from 'react-native-purchases';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import {
  fetchOfferings,
  getOfferingPackage,
  purchasePackage,
  restorePurchases,
  hasProEntitlement,
} from '@/lib/revenueCat';
import { captureEvent, EVENTS } from '@/lib/analytics';
import { captureError } from '@/lib/sentry';
import OnboardingProgress from '@/components/OnboardingProgress';

const PRIVACY_POLICY_URL = 'https://thrive.hyperactivestudio.xyz/privacy';
const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

type PlanOption = 'yearly' | 'monthly';

export default function PaywallScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { refetch: refetchSubscription } = useSubscription();
  const params = useLocalSearchParams<{
    goals?: string;
    experience?: string;
    challenge?: string;
  }>();

  const isAuthenticated = !!user;

  const [selectedPlan, setSelectedPlan] = useState<PlanOption>('yearly');
  const [packages, setPackages] = useState<{
    monthly: PurchasesPackage | null;
    yearly: PurchasesPackage | null;
  }>({ monthly: null, yearly: null });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  useEffect(() => {
    loadOfferings();
    captureEvent(EVENTS.PAYWALL_VIEWED, { source: 'onboarding' });
  }, []);

  const loadOfferings = async () => {
    setLoadError(false);
    setLoading(true);
    try {
      const offering = await fetchOfferings();
      if (offering) {
        const monthly = getOfferingPackage(offering, 'monthly');
        const yearly = getOfferingPackage(offering, 'yearly');
        setPackages({ monthly, yearly });
        if (!monthly && !yearly) setLoadError(true);
      } else {
        setLoadError(true);
      }
    } catch (err) {
      console.warn('[Paywall] Failed to load offerings:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = useCallback(async () => {
    const pkg = selectedPlan === 'yearly' ? packages.yearly : packages.monthly;
    if (!pkg) {
      Alert.alert('Unavailable', 'This plan is not available right now. Please try again later.');
      return;
    }

    setPurchasing(true);
    captureEvent(EVENTS.CHECKOUT_STARTED, { plan_type: selectedPlan });
    try {
      const info = await purchasePackage(pkg);
      if (hasProEntitlement(info)) {
        captureEvent(EVENTS.SUBSCRIPTION_STARTED, {
          plan_type: selectedPlan,
          is_trial: true,
          has_discount: false,
        });
        if (isAuthenticated) {
          await refetchSubscription();
        }
        navigateAfterPurchase();
      }
    } catch (err: any) {
      if (err.userCancelled) return;
      captureError(err, { tag: 'paywall.purchase', extra: { plan: selectedPlan } });
      Alert.alert('Purchase Failed', err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  }, [selectedPlan, packages, refetchSubscription, isAuthenticated]);

  const handleRestore = useCallback(async () => {
    setPurchasing(true);
    try {
      const info = await restorePurchases();
      if (hasProEntitlement(info)) {
        captureEvent(EVENTS.SUBSCRIPTION_RESTORED, { plan_type: 'restored' });
        if (isAuthenticated) {
          await refetchSubscription();
        }
        navigateAfterPurchase();
      } else {
        Alert.alert('No Subscription Found', 'We couldn\'t find an active subscription for this account.');
      }
    } catch (err: any) {
      captureError(err, { tag: 'paywall.restore' });
      Alert.alert('Restore Failed', err.message ?? 'Something went wrong.');
    } finally {
      setPurchasing(false);
    }
  }, [refetchSubscription, isAuthenticated]);

  const onboardingParams = {
    goals: params.goals ?? '[]',
    experience: params.experience ?? 'beginner',
    challenge: params.challenge ?? 'motivation',
  };

  const navigateAfterPurchase = () => {
    if (isAuthenticated) {
      router.push({
        pathname: '/(onboarding)/habits',
        params: onboardingParams,
      });
    } else {
      router.push({
        pathname: '/(auth)/sign-up',
        params: onboardingParams,
      });
    }
  };

  const yearlyPkg = packages.yearly;
  const monthlyPkg = packages.monthly;
  const yearlyPrice = yearlyPkg?.product.priceString ?? '$99.99';
  const monthlyPrice = monthlyPkg?.product.priceString ?? '$12.99';
  const yearlyMonthly = yearlyPkg
    ? `$${(yearlyPkg.product.price / 12).toFixed(2)}`
    : '$8.33';

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress current={5} total={7} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Start Your{'\n'}7-Day Free Trial</Text>
          <Text style={styles.subtitle}>
            Full access to everything in Thrive.{'\n'}Cancel anytime.
          </Text>
        </View>

        <View style={styles.timeline}>
          {[
            { day: 'Today', text: 'Full access starts', icon: 'unlock' },
            { day: 'Day 5', text: "We'll remind you", icon: 'bell-o' },
            { day: 'Day 7', text: 'Subscription begins', icon: 'credit-card' },
          ].map((step, i) => (
            <View key={i} style={styles.timelineRow}>
              <View style={styles.timelineDot}>
                <FontAwesome name={step.icon as any} size={12} color={colors.primary} />
              </View>
              {i < 2 && <View style={styles.timelineLine} />}
              <View style={styles.timelineContent}>
                <Text style={styles.timelineDay}>{step.day}</Text>
                <Text style={styles.timelineText}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'yearly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('yearly')}
            activeOpacity={0.7}
          >
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>Best Value</Text>
            </View>
            <View style={styles.planHeader}>
              <View style={[styles.radio, selectedPlan === 'yearly' && styles.radioSelected]}>
                {selectedPlan === 'yearly' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.planName}>Yearly</Text>
            </View>
            <Text style={styles.planPrice}>{yearlyPrice}/year</Text>
            <Text style={styles.planMonthly}>{yearlyMonthly}/mo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.7}
          >
            <View style={styles.planHeader}>
              <View style={[styles.radio, selectedPlan === 'monthly' && styles.radioSelected]}>
                {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.planName}>Monthly</Text>
            </View>
            <Text style={styles.planPrice}>{monthlyPrice}/month</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <View style={styles.bottom}>
        {loadError && !loading ? (
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={loadOfferings}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaText}>Retry Loading Plans</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.ctaButton, (purchasing || loading) && { opacity: 0.7 }]}
            onPress={handlePurchase}
            disabled={purchasing || loading}
            activeOpacity={0.8}
          >
            {purchasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Start Free Trial</Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={purchasing}
          activeOpacity={0.7}
        >
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={styles.legalDisclosure}>
          After your 7-day free trial, subscription automatically renews at {selectedPlan === 'yearly' ? `${yearlyPrice}/year` : `${monthlyPrice}/month`} unless
          cancelled at least 24 hours before the end of the current period.
          Payment will be charged to your Apple ID account.
        </Text>
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(TERMS_OF_USE_URL)}>
            <Text style={styles.legalLinkText}>Terms of Use</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>|</Text>
          <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}>
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    header: {
      alignItems: 'center',
      paddingTop: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: theme.fontSize.xxl,
      fontWeight: theme.fontWeight.bold,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.fontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    timeline: {
      marginBottom: theme.spacing.lg,
      paddingLeft: theme.spacing.sm,
    },
    timelineRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      minHeight: 48,
    },
    timelineDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primaryLightOverlay30,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    timelineLine: {
      position: 'absolute',
      left: theme.spacing.sm + 13,
      top: 28,
      width: 2,
      height: 20,
      backgroundColor: colors.borderLight,
    },
    timelineContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginLeft: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    timelineDay: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.bold,
      color: colors.primary,
      width: 50,
    },
    timelineText: {
      fontSize: theme.fontSize.sm,
      color: colors.textPrimary,
    },
    plans: {
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    planCard: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
    },
    planCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLightOverlay15,
    },
    planBadge: {
      position: 'absolute',
      top: -10,
      right: theme.spacing.md,
      backgroundColor: colors.primary,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
    },
    planBadgeText: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.bold,
      color: '#fff',
    },
    planHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: {
      borderColor: colors.primary,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    planName: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textPrimary,
    },
    planPrice: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      color: colors.textPrimary,
      marginLeft: 30,
    },
    planMonthly: {
      fontSize: theme.fontSize.sm,
      color: colors.textSecondary,
      marginLeft: 30,
      marginTop: 2,
    },
    bottom: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      paddingTop: theme.spacing.xs,
      gap: theme.spacing.sm,
    },
    ctaButton: {
      backgroundColor: colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: 18,
      alignItems: 'center',
      ...theme.shadow.md,
    },
    ctaText: {
      color: '#fff',
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
    },
    restoreButton: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
    },
    restoreText: {
      fontSize: theme.fontSize.sm,
      color: colors.textMuted,
    },
    legalDisclosure: {
      fontSize: theme.fontSize.xs,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 16,
      paddingHorizontal: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    legalLinks: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    legalLinkText: {
      fontSize: theme.fontSize.xs,
      color: colors.primary,
    },
    legalSeparator: {
      fontSize: theme.fontSize.xs,
      color: colors.textMuted,
    },
  });
