import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EVENTS, captureEvent } from '@/lib/analytics';
import { queryKeys } from '@/lib/queryClient';
import type { DailyJournalEntry } from '@/lib/types';
import {
  getJournalForDate,
  getJournalForDateRange,
  upsertJournalEntry,
  deleteJournalEntry,
} from '@/lib/dailyJournal';

const STALE = {
  journal: 1000 * 30,
} as const;

export function useDailyJournal(date: string) {
  return useQuery({
    queryKey: queryKeys.dailyJournal.forDate(date),
    queryFn: () => getJournalForDate(date),
    staleTime: STALE.journal,
  });
}

export function useDailyJournalForRange(start: string, end: string) {
  return useQuery({
    queryKey: queryKeys.dailyJournal.forRange(start, end),
    queryFn: () => getJournalForDateRange(start, end),
    staleTime: STALE.journal,
  });
}

export function useUpsertJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      date,
      win,
      tension,
      gratitude,
    }: {
      userId: string;
      date: string;
      win: string;
      tension: string;
      gratitude: string;
    }) => upsertJournalEntry(userId, date, win, tension, gratitude),
    onMutate: async (variables) => {
      const key = queryKeys.dailyJournal.forDate(variables.date);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<DailyJournalEntry | null>(key);

      qc.setQueryData<DailyJournalEntry | null>(key, (old) => ({
        id: old?.id ?? `optimistic-journal`,
        user_id: variables.userId,
        journal_date: variables.date,
        win: variables.win,
        tension: variables.tension,
        gratitude: variables.gratitude,
        created_at: old?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      return { previous };
    },
    onSuccess: (_, variables, context) => {
      captureEvent(EVENTS.JOURNAL_SUBMITTED, {
        is_edit: context?.previous != null,
        date: variables.date,
      });
    },
    onError: (_err, variables, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(queryKeys.dailyJournal.forDate(variables.date), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['dailyJournal'] });
    },
  });
}

export function useDeleteJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
    }: {
      entryId: string;
      date: string;
    }) => deleteJournalEntry(entryId),
    onMutate: async (variables) => {
      const key = queryKeys.dailyJournal.forDate(variables.date);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<DailyJournalEntry | null>(key);
      qc.setQueryData<DailyJournalEntry | null>(key, null);
      return { previous };
    },
    onError: (_err, variables, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(queryKeys.dailyJournal.forDate(variables.date), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['dailyJournal'] });
    },
  });
}
