import { toggleHabitCompletion, snoozeHabit, unsnoozeHabit } from './habits';
import {
  getPendingMutations,
  removePendingMutation,
  PendingMutation,
} from './offlineStorage';
import { queryClient } from './queryClient';

/**
 * Process all pending offline mutations sequentially.
 * Each mutation is removed from the queue after successful execution.
 * If a mutation fails (e.g. duplicate key), it's still removed since
 * the server state is already correct.
 */
export async function syncPendingMutations(): Promise<{
  synced: number;
  failed: number;
}> {
  const mutations = await getPendingMutations();
  if (mutations.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const mutation of mutations) {
    try {
      await executeMutation(mutation);
      synced++;
    } catch (error) {
      // If it's a duplicate/conflict error, the server state is correct already.
      // Remove the mutation either way to avoid infinite retry loops.
      const msg = error instanceof Error ? error.message : String(error);
      const isConflict =
        msg.includes('duplicate') ||
        msg.includes('unique') ||
        msg.includes('conflict') ||
        msg.includes('already exists');

      if (isConflict) {
        synced++;
      } else {
        console.error(`Failed to sync mutation ${mutation.id}:`, error);
        failed++;
      }
    }
    // Always remove the mutation from the queue after processing
    await removePendingMutation(mutation.id);
  }

  // Invalidate all caches after sync so UI shows fresh server state
  if (synced > 0) {
    queryClient.invalidateQueries({ queryKey: ['completions'] });
    queryClient.invalidateQueries({ queryKey: ['snoozes'] });
    queryClient.invalidateQueries({ queryKey: ['streak'] });
    queryClient.invalidateQueries({ queryKey: ['habits'] });
  }

  return { synced, failed };
}

async function executeMutation(mutation: PendingMutation): Promise<void> {
  const { type, payload } = mutation;

  switch (type) {
    case 'toggle_completion':
      await toggleHabitCompletion(
        payload.habitId as string,
        payload.userId as string,
        payload.date as string,
        payload.isCompleted as boolean
      );
      break;

    case 'snooze':
      await snoozeHabit(
        payload.habitId as string,
        payload.userId as string,
        payload.date as string
      );
      break;

    case 'unsnooze':
      await unsnoozeHabit(
        payload.habitId as string,
        payload.date as string
      );
      break;

    default:
      console.warn(`Unknown mutation type: ${type}`);
  }
}
