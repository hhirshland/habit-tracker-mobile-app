import { useCallback } from 'react';
import { usePostHog } from 'posthog-react-native';
import type { JsonType } from '@posthog/core';
import { EVENTS } from '@/lib/analytics';

type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export function useAnalytics() {
  const posthog = usePostHog();

  const track = useCallback(
    (event: EventName, properties?: Record<string, JsonType>) => {
      posthog.capture(event, properties);
    },
    [posthog]
  );

  const identify = useCallback(
    (distinctId: string, properties?: Record<string, JsonType>) => {
      posthog.identify(distinctId, properties);
    },
    [posthog]
  );

  const reset = useCallback(() => {
    posthog.reset();
  }, [posthog]);

  const screen = useCallback(
    (screenName: string, properties?: Record<string, JsonType>) => {
      posthog.screen(screenName, properties);
    },
    [posthog]
  );

  return { track, identify, reset, screen, posthog };
}
