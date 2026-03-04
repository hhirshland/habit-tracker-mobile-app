import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="experience" />
      <Stack.Screen name="challenge" />
      <Stack.Screen name="plan" />
      <Stack.Screen name="paywall" />
      <Stack.Screen name="habits" />
      <Stack.Screen name="features" />
    </Stack>
  );
}
