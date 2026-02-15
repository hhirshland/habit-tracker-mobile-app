import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { HealthProvider } from '@/contexts/HealthContext';
import { queryClient } from '@/lib/queryClient';
import { theme } from '@/lib/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { syncPendingMutations } from '@/lib/offlineSync';
import { getPendingMutations } from '@/lib/offlineStorage';
import OfflineBanner from '@/components/OfflineBanner';

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
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <HealthProvider>
            <OfflineSyncProvider>
              <RootLayoutNav />
            </OfflineSyncProvider>
          </HealthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

/** Handles offline banner display and auto-sync on reconnection */
function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const { isOffline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const wasOffline = useRef(false);

  // Track pending mutation count
  useEffect(() => {
    if (isOffline) {
      const interval = setInterval(async () => {
        const mutations = await getPendingMutations();
        setPendingCount(mutations.length);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setPendingCount(0);
    }
  }, [isOffline]);

  // Sync pending mutations when coming back online
  useEffect(() => {
    if (wasOffline.current && !isOffline) {
      syncPendingMutations().then(({ synced, failed }) => {
        if (synced > 0 || failed > 0) {
          console.log(`Offline sync: ${synced} synced, ${failed} failed`);
        }
        setPendingCount(0);
      });
    }
    wasOffline.current = isOffline;
  }, [isOffline]);

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner isOffline={isOffline} pendingCount={pendingCount} />
      {children}
    </View>
  );
}

function RootLayoutNav() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!session) {
      // Not signed in - redirect to auth
      if (!inAuthGroup) {
        router.replace('/(auth)/sign-in');
      }
    } else if (!profile?.has_onboarded) {
      // Signed in but hasn't onboarded
      if (!inOnboardingGroup) {
        router.replace('/(onboarding)');
      }
    } else {
      // Signed in and onboarded
      if (inAuthGroup || inOnboardingGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [session, profile, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
