type SegmentRoot = string | undefined;

interface AuthRedirectParams {
  hasSession: boolean;
  onboardingState: boolean | undefined;
  segmentRoot: SegmentRoot;
}

/**
 * Returns the redirect target for auth/onboarding navigation guards.
 * Returns null when no redirect should happen.
 */
export function getAuthRedirectTarget({
  hasSession,
  onboardingState,
  segmentRoot,
}: AuthRedirectParams): string | null {
  const inAuthGroup = segmentRoot === '(auth)';
  const inOnboardingGroup = segmentRoot === '(onboarding)';

  if (!hasSession) {
    return inAuthGroup ? null : '/(auth)/sign-in';
  }

  // Only route to onboarding when onboarding status is explicitly false.
  // If profile is still loading and onboardingState is undefined, keep users out of
  // auth/onboarding groups and let them land on tabs.
  if (onboardingState === false) {
    return inOnboardingGroup ? null : '/(onboarding)';
  }

  if (onboardingState === true || onboardingState === undefined) {
    return inAuthGroup || inOnboardingGroup ? '/(tabs)' : null;
  }

  return null;
}
