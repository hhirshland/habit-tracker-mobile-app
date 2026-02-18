import { supabase } from './supabase';
import { DailyJournalEntry } from './types';

export async function getJournalForDate(
  date: string
): Promise<DailyJournalEntry | null> {
  const { data, error } = await supabase
    .from('daily_journal_entries')
    .select('*')
    .eq('journal_date', date)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getJournalForDateRange(
  startDate: string,
  endDate: string
): Promise<DailyJournalEntry[]> {
  const { data, error } = await supabase
    .from('daily_journal_entries')
    .select('*')
    .gte('journal_date', startDate)
    .lte('journal_date', endDate)
    .order('journal_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertJournalEntry(
  userId: string,
  date: string,
  win: string,
  tension: string,
  gratitude: string
): Promise<DailyJournalEntry> {
  const { data, error } = await supabase
    .from('daily_journal_entries')
    .upsert(
      {
        user_id: userId,
        journal_date: date,
        win,
        tension,
        gratitude,
      },
      { onConflict: 'user_id,journal_date' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteJournalEntry(entryId: string): Promise<void> {
  const { error } = await supabase
    .from('daily_journal_entries')
    .delete()
    .eq('id', entryId);

  if (error) throw error;
}
