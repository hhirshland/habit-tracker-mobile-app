import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  LEGACY_JOURNAL_STORAGE_KEY,
  LEGACY_TOP3_TODOS_STORAGE_KEY,
  normalizeUserSettings,
  USER_SETTINGS_STORAGE_KEY,
} from '@/lib/userSettings';

export const NOTIFICATIONS_ENABLED_STORAGE_KEY = '@notifications_enabled';

const REMINDER_CHANNEL_ID = 'daily-reminders';
const HABIT_REMINDER_ID = 'habit-reminder';
const TODO_REMINDER_ID = 'todo-reminder';

async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Daily Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4A90E2',
  });
}

function asBoolean(value: string | null) {
  return value === 'true';
}

async function getSettings() {
  const [notificationsEnabledValue, userSettingsRaw] = await Promise.all([
    AsyncStorage.getItem(NOTIFICATIONS_ENABLED_STORAGE_KEY),
    AsyncStorage.getItem(USER_SETTINGS_STORAGE_KEY),
  ]);

  let top3TodosEnabled = false;
  let journalEnabled = false;

  if (userSettingsRaw) {
    try {
      const userSettings = normalizeUserSettings(JSON.parse(userSettingsRaw));
      top3TodosEnabled = userSettings.top3_todos_enabled;
      journalEnabled = userSettings.journal_enabled;
    } catch (error) {
      console.warn('Invalid user settings payload while scheduling notifications.', error);
    }
  } else {
    const [legacyTop3Value, legacyJournalValue] = await Promise.all([
      AsyncStorage.getItem(LEGACY_TOP3_TODOS_STORAGE_KEY),
      AsyncStorage.getItem(LEGACY_JOURNAL_STORAGE_KEY),
    ]);
    top3TodosEnabled = asBoolean(legacyTop3Value);
    journalEnabled = asBoolean(legacyJournalValue);
  }

  return {
    notificationsEnabled: asBoolean(notificationsEnabledValue),
    top3TodosEnabled,
    journalEnabled,
  };
}

async function scheduleReminder({
  reminderId,
  title,
  body,
  hour,
  minute,
}: {
  reminderId: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data: {
        reminder_id: reminderId,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {}),
    },
  });
}

export async function requestNotificationPermissions() {
  await ensureNotificationChannel();

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return requested.granted;
}

export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function rescheduleNotifications() {
  await ensureNotificationChannel();

  await cancelAllScheduledNotifications();

  const { notificationsEnabled, top3TodosEnabled, journalEnabled } = await getSettings();
  if (!notificationsEnabled) return;

  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) return;

  await scheduleReminder({
    reminderId: HABIT_REMINDER_ID,
    title: 'Daily habits check-in',
    body: journalEnabled
      ? "Time to check off your daily habits. Don't forget your journal entry."
      : 'Time to check off your daily habits.',
    hour: 20,
    minute: 0,
  });

  if (top3TodosEnabled) {
    await scheduleReminder({
      reminderId: TODO_REMINDER_ID,
      title: 'Set your Top 3 todos',
      body: 'Set your top 3 priorities for today.',
      hour: 8,
      minute: 0,
    });
  }
}
