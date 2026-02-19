import FontAwesome from '@expo/vector-icons/FontAwesome';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Href, Stack, usePathname, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { PostHogProvider } from 'posthog-react-native';

import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { HealthProvider } from '@/contexts/HealthContext';
import { UserSettingsProvider, useUserSettings } from '@/contexts/UserSettingsContext';
import { setSuperProperties, trackScreen } from '@/lib/analytics';
import { getAuthRedirectTarget } from '@/lib/authRouting';
import { rescheduleNotifications } from '@/lib/notifications';
import { posthogClient } from '@/lib/posthog';
import { queryClient } from '@/lib/queryClient';
import { theme } from '@/lib/theme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

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

function RootLayoutNav() {
  const { session, profile, loading } = useAuth();
  const { resolvedTheme } = useUserSettings();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const lastTrackedPath = useRef<string | null>(null);
  const [hasHydratedAuth, setHasHydratedAuth] = useState(false);

  useEffect(() => {
    if (!loading && !hasHydratedAuth) {
      setHasHydratedAuth(true);
    }
  }, [loading, hasHydratedAuth]);

  useEffect(() => {
    if (loading) return;

    const redirectTarget = getAuthRedirectTarget({
      hasSession: !!session,
      onboardingState: profile?.has_onboarded,
      segmentRoot: segments[0],
    });

    if (redirectTarget) {
      router.replace(redirectTarget as Href);
    }
  }, [session, profile, loading, segments]);

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
    });
  }, [hasHydratedAuth]);

  // Keep initial blocking loader, but avoid remounting root navigation during
  // periodic background auth refreshes (e.g. token refresh).
  if (loading && !hasHydratedAuth) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
