type SegmentRoot = string | undefined;

interface AuthRedirectParams {
  hasSession: boolean;
  onboardingState: boolean | undefined;
  subscriptionActive: boolean | undefined;
  segmentRoot: SegmentRoot;
}

/**
 * Returns the redirect target for auth/onboarding/subscription navigation guards.
 * Returns null when no redirect should happen.
 */
export function getAuthRedirectTarget({
  hasSession,
  onboardingState,
  subscriptionActive,
  segmentRoot,
}: AuthRedirectParams): string | null {
  const inAuthGroup = segmentRoot === '(auth)';
  const inOnboardingGroup = segmentRoot === '(onboarding)';

  if (!hasSession) {
    return inAuthGroup ? null : '/(auth)/sign-in';
  }

  // Only route to onboarding when onboarding status is explicitly false.
  if (onboardingState === false) {
    return inOnboardingGroup ? null : '/(onboarding)';
  }

  // After onboarding, gate on subscription if explicitly inactive.
  // Route to the paywall screen within the onboarding group.
  if (onboardingState === true && subscriptionActive === false) {
    if (inOnboardingGroup) return null;
    return '/(onboarding)/paywall';
  }

  if (onboardingState === true || onboardingState === undefined) {
    return inAuthGroup || inOnboardingGroup ? '/(tabs)' : null;
  }

  return null;
}
