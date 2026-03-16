import * as Haptics from 'expo-haptics';

function safe(fn: () => Promise<void>) {
  try {
    fn();
  } catch {}
}

export const hapticSuccess = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

export const hapticWarning = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

export const hapticError = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));

export const hapticLight = () =>
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

export const hapticMedium = () =>
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

export const hapticHeavy = () =>
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));

export const hapticSelection = () =>
  safe(() => Haptics.selectionAsync());
