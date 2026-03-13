import { Stack } from 'expo-router';

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
