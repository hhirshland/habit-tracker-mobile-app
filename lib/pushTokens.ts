import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

/**
 * Register the device's Expo push token with the server.
 * Upserts into push_tokens so the nudge engine can send remote notifications.
 * Safe to call multiple times — the unique constraint on (user_id, token) handles dedup.
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn('No EAS project ID found — cannot register push token');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    if (!token) return null;

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { token, platform, user_id: (await supabase.auth.getUser()).data.user?.id },
        { onConflict: 'user_id,token' },
      );

    if (error) {
      console.error('Error registering push token:', error);
      return null;
    }

    return token;
  } catch (err) {
    console.error('Error in registerPushToken:', err);
    return null;
  }
}
