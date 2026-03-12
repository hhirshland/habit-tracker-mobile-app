import FontAwesome from '@expo/vector-icons/FontAwesome';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Href, Stack, usePathname, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { PostHogProvider } from 'posthog-react-native';

import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { HealthProvider } from '@/contexts/HealthContext';
import { UserSettingsProvider, useUserSettings } from '@/contexts/UserSettingsContext';
import * as Notifications from 'expo-notifications';
import { captureEvent, EVENTS, setSuperProperties, trackScreen } from '@/lib/analytics';
import { getAuthRedirectTarget } from '@/lib/authRouting';
import { rescheduleNotifications, WEEKLY_RECAP_REMINDER_ID } from '@/lib/notifications';
import { configureRevenueCat } from '@/lib/revenueCat';
import { posthogClient } from '@/lib/posthog';
import { queryClient } from '@/lib/queryClient';
import { useSubscription } from '@/hooks/useSubscription';
import { useOTAUpdates } from '@/hooks/useOTAUpdates';
import { initSentry, captureError, Sentry } from '@/lib/sentry';

initSentry();

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  Sentry.captureException(error);
  return (
    <View style={ebStyles.container}>
      <Text style={ebStyles.title}>Something went wrong</Text>
      <Text style={ebStyles.message}>{error.message}</Text>
      <TouchableOpacity style={ebStyles.button} onPress={retry}>
        <Text style={ebStyles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const ebStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  message: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#4A90E2', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {posthogClient ? (
        <PostHogProvider client={posthogClient}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <UserSettingsProvider>
                <HealthProvider>
                  <RootLayoutNav />
                </HealthProvider>
              </UserSettingsProvider>
            </AuthProvider>
          </QueryClientProvider>
        </PostHogProvider>
      ) : (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <UserSettingsProvider>
              <HealthProvider>
                <RootLayoutNav />
              </HealthProvider>
            </UserSettingsProvider>
          </AuthProvider>
        </QueryClientProvider>
      )}
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

function RootLayoutNav() {
  useOTAUpdates();

  const { session, profile, loading } = useAuth();
  const { resolvedTheme } = useUserSettings();
  const { isActive: subscriptionActive, isLoading: subscriptionLoading } = useSubscription();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const lastTrackedPath = useRef<string | null>(null);
  const [hasHydratedAuth, setHasHydratedAuth] = useState(false);

  useEffect(() => {
    configureRevenueCat();
  }, []);

  useEffect(() => {
    if (session?.user) {
      Sentry.setUser({ id: session.user.id, email: session.user.email });
    } else {
      Sentry.setUser(null);
    }
  }, [session]);

  useEffect(() => {
    if (!loading && !hasHydratedAuth) {
      setHasHydratedAuth(true);
    }
  }, [loading, hasHydratedAuth]);

  useEffect(() => {
    if (!hasHydratedAuth) return;

    SplashScreen.hideAsync().catch((error) => {
      console.error('Error hiding splash screen:', error);
    });
  }, [hasHydratedAuth]);

  useEffect(() => {
    if (loading || subscriptionLoading) return;

    const redirectTarget = getAuthRedirectTarget({
      hasSession: !!session,
      onboardingState: profile?.has_onboarded,
      subscriptionActive: session ? subscriptionActive : undefined,
      segmentRoot: segments[0],
    });

    if (redirectTarget) {
      router.replace(redirectTarget as Href);
    }
  }, [session, profile, loading, segments, subscriptionActive, subscriptionLoading]);

  useEffect(() => {
    setSuperProperties({
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version ?? 'unknown',
      has_onboarded: !!profile?.has_onboarded,
    });
  }, [profile?.has_onboarded]);

  useEffect(() => {
    if (!pathname || lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;
    trackScreen(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!hasHydratedAuth) return;

    rescheduleNotifications().catch((error) => {
      console.error('Error rescheduling notifications on app launch:', error);
      captureError(error, { tag: 'notifications.reschedule' });
    });
  }, [hasHydratedAuth]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const reminderId =
        (response.notification.request.content.data?.reminder_id as string) ?? 'unknown';
      captureEvent(EVENTS.NOTIFICATION_OPENED, { reminder_id: reminderId });

      if (reminderId === WEEKLY_RECAP_REMINDER_ID) {
        router.navigate('/(tabs)/progress' as Href);
      }
    });
    return () => subscription.remove();
  }, [router]);

  return (
    <>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="identity-setup" options={{ presentation: 'modal' }} />
        <Stack.Screen name="manage-habits" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
