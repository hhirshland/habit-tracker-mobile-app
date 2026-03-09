import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

export function initSentry() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
    attachScreenshot: true,
    environment: __DEV__ ? 'development' : 'production',
  });
}

/**
 * Report an error to Sentry with optional contextual tags.
 * Keeps console.error for local dev visibility; adds Sentry reporting for prod.
 */
export function captureError(error: unknown, context?: { tag?: string; extra?: Record<string, unknown> }) {
  if (!dsn) return;
  Sentry.withScope((scope) => {
    if (context?.tag) scope.setTag('source', context.tag);
    if (context?.extra) {
      for (const [key, value] of Object.entries(context.extra)) {
        scope.setExtra(key, value);
      }
    }
    Sentry.captureException(error);
  });
}

export { Sentry };
