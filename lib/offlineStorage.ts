import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Keys ──────────────────────────────────────
const PENDING_MUTATIONS_KEY = '@offline_pending_mutations';
const CACHED_HABITS_KEY = '@offline_cached_habits';
const CACHED_COMPLETIONS_PREFIX = '@offline_cached_completions_';
const CACHED_SNOOZES_PREFIX = '@offline_cached_snoozes_';

// ── Types ─────────────────────────────────────

export type MutationType =
  | 'toggle_completion'
  | 'snooze'
  | 'unsnooze';

export interface PendingMutation {
  id: string;
  type: MutationType;
  payload: Record<string, unknown>;
  createdAt: string;
}

// ── Pending Mutations Queue ───────────────────

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const raw = await AsyncStorage.getItem(PENDING_MUTATIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function addPendingMutation(
  type: MutationType,
  payload: Record<string, unknown>
): Promise<void> {
  const mutations = await getPendingMutations();
  const mutation: PendingMutation = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
  };
  mutations.push(mutation);
  await AsyncStorage.setItem(PENDING_MUTATIONS_KEY, JSON.stringify(mutations));
}

export async function removePendingMutation(id: string): Promise<void> {
  const mutations = await getPendingMutations();
  const filtered = mutations.filter((m) => m.id !== id);
  await AsyncStorage.setItem(PENDING_MUTATIONS_KEY, JSON.stringify(filtered));
}

export async function clearPendingMutations(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_MUTATIONS_KEY);
}

// ── Cached Data ───────────────────────────────
// These functions store/retrieve the latest server data locally
// so the app can display it when offline.

export async function cacheHabits(habits: unknown[]): Promise<void> {
  await AsyncStorage.setItem(CACHED_HABITS_KEY, JSON.stringify(habits));
}

export async function getCachedHabits(): Promise<unknown[] | null> {
  const raw = await AsyncStorage.getItem(CACHED_HABITS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function completionsCacheKey(date: string): string {
  return `${CACHED_COMPLETIONS_PREFIX}${date}`;
}

export async function cacheCompletionsForDate(
  date: string,
  completions: unknown[]
): Promise<void> {
  await AsyncStorage.setItem(completionsCacheKey(date), JSON.stringify(completions));
}

export async function getCachedCompletionsForDate(
  date: string
): Promise<unknown[] | null> {
  const raw = await AsyncStorage.getItem(completionsCacheKey(date));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function snoozesCacheKey(date: string): string {
  return `${CACHED_SNOOZES_PREFIX}${date}`;
}

export async function cacheSnoozesForDate(
  date: string,
  snoozes: unknown[]
): Promise<void> {
  await AsyncStorage.setItem(snoozesCacheKey(date), JSON.stringify(snoozes));
}

export async function getCachedSnoozesForDate(
  date: string
): Promise<unknown[] | null> {
  const raw = await AsyncStorage.getItem(snoozesCacheKey(date));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
