import Constants from 'expo-constants';
import PostHog from 'posthog-react-native';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  posthogApiKey?: string;
  posthogHost?: string;
};

const posthogApiKey = extra.posthogApiKey || process.env.EXPO_PUBLIC_POSTHOG_KEY || '';
const posthogHost = extra.posthogHost || process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export const posthogClient = posthogApiKey
  ? new PostHog(posthogApiKey, {
      host: posthogHost,
      captureAppLifecycleEvents: true,
      flushAt: 20,
      flushInterval: 30000,
    })
  : null;
