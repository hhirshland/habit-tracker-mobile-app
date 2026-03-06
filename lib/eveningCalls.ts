import { supabase } from './supabase';

export interface EveningCallPreferences {
  phone_number: string | null;
  evening_call_enabled: boolean;
  evening_call_time: string; // "HH:MM:SS" from Postgres time type
  timezone: string;
}

export async function updateEveningCallPreferences(
  userId: string,
  preferences: Partial<EveningCallPreferences>,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(preferences)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function triggerEveningCall(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke(
    'schedule-evening-calls',
    { body: { user_id: userId } },
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: data?.success ?? false, error: data?.error };
}

// ─── Display helpers ───

export function formatCallTime(timeStr: string): string {
  const [hoursStr, minutesStr] = timeStr.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';

  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;

  return minutes === 0 ? `${hours} ${ampm}` : `${hours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

export function formatTimezoneShort(tz: string): string {
  try {
    const abbr = new Date()
      .toLocaleTimeString('en-US', { timeZone: tz, timeZoneName: 'short' })
      .split(' ')
      .pop();
    return abbr || tz;
  } catch {
    return tz;
  }
}

export const CALL_TIME_OPTIONS: string[] = Array.from({ length: 14 }, (_, i) => {
  const h = 17 + Math.floor(i / 2);
  const m = (i % 2) * 30;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
});

export function normalizePhoneNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length > 10 && raw.startsWith('+')) return `+${digits}`;

  return null;
}

export function formatPhoneDisplay(e164: string): string {
  if (!e164) return '';
  const digits = e164.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('1')) {
    const area = digits.slice(1, 4);
    const prefix = digits.slice(4, 7);
    const line = digits.slice(7);
    return `(${area}) ${prefix}-${line}`;
  }

  return e164;
}
