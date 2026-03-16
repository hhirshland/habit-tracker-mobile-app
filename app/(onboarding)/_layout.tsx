import { Stack } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sentry } from '@/lib/sentry';

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  Sentry.captureException(error);
  return (
    <View style={ebStyles.container}>
      <Text style={ebStyles.title}>Something went wrong</Text>
      <Text style={ebStyles.message}>We hit a snag loading this section. Please try again.</Text>
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

// Onboarding flow (6 screens, 5 with progress bar):
//
//   index     — Welcome splash (no progress bar)
//   paywall   — OnboardingProgress current={1} total={5}
//   signup    — OnboardingProgress current={2} total={5}
//   identity  — OnboardingProgress current={3} total={5}
//   habits    — OnboardingProgress current={4} total={5}
//   features  — OnboardingProgress current={5} total={5}
//
// Rules:
//   - total must be 5 on every screen that shows OnboardingProgress
//   - Analytics step_number must match the progress bar current value
//   - app/(auth)/sign-up.tsx does NOT show OnboardingProgress

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="paywall" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="email-signup" />
      <Stack.Screen name="identity" />
      <Stack.Screen name="habits" />
      <Stack.Screen name="features" />
    </Stack>
  );
}
