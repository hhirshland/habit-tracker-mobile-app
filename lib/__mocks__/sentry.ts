export const initSentry = jest.fn();
export const captureError = jest.fn();
export const Sentry = {
  init: jest.fn(),
  withScope: jest.fn(),
  captureException: jest.fn(),
};
