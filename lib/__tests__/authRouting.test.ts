import { getAuthRedirectTarget } from '../authRouting';

describe('getAuthRedirectTarget', () => {
  it('redirects signed-out users to sign-in when outside auth group', () => {
    const result = getAuthRedirectTarget({
      hasSession: false,
      onboardingState: undefined,
      segmentRoot: '(tabs)',
    });

    expect(result).toBe('/(auth)/sign-in');
  });

  it('does not redirect signed-out users already in auth group', () => {
    const result = getAuthRedirectTarget({
      hasSession: false,
      onboardingState: undefined,
      segmentRoot: '(auth)',
    });

    expect(result).toBeNull();
  });

  it('redirects to onboarding only when onboarding is explicitly false', () => {
    const result = getAuthRedirectTarget({
      hasSession: true,
      onboardingState: false,
      segmentRoot: '(tabs)',
    });

    expect(result).toBe('/(onboarding)');
  });

  it('does not redirect to onboarding when onboarding state is temporarily unknown', () => {
    const result = getAuthRedirectTarget({
      hasSession: true,
      onboardingState: undefined,
      segmentRoot: '(tabs)',
    });

    expect(result).toBeNull();
  });

  it('redirects users in onboarding to tabs when onboarding state is temporarily unknown', () => {
    const result = getAuthRedirectTarget({
      hasSession: true,
      onboardingState: undefined,
      segmentRoot: '(onboarding)',
    });

    expect(result).toBe('/(tabs)');
  });

  it('redirects users in auth to tabs when onboarding state is temporarily unknown', () => {
    const result = getAuthRedirectTarget({
      hasSession: true,
      onboardingState: undefined,
      segmentRoot: '(auth)',
    });

    expect(result).toBe('/(tabs)');
  });

  it('redirects onboarded users out of auth group to tabs', () => {
    const result = getAuthRedirectTarget({
      hasSession: true,
      onboardingState: true,
      segmentRoot: '(auth)',
    });

    expect(result).toBe('/(tabs)');
  });

  it('does not redirect onboarded users already in tabs', () => {
    const result = getAuthRedirectTarget({
      hasSession: true,
      onboardingState: true,
      segmentRoot: '(tabs)',
    });

    expect(result).toBeNull();
  });
});
