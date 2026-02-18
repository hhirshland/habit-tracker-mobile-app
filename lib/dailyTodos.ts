import { supabase } from './supabase';
import { DailyTodo } from './types';

export async function getDailyTodosForDate(date: string): Promise<DailyTodo[]> {
  const { data, error } = await supabase
    .from('daily_todos')
    .select('*')
    .eq('todo_date', date)
    .order('position', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getDailyTodosForDateRange(
  startDate: string,
  endDate: string
): Promise<DailyTodo[]> {
  const { data, error } = await supabase
    .from('daily_todos')
    .select('*')
    .gte('todo_date', startDate)
    .lte('todo_date', endDate)
    .order('todo_date', { ascending: true })
    .order('position', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function upsertDailyTodo(
  userId: string,
  date: string,
  position: number,
  text: string
): Promise<DailyTodo> {
  const { data, error } = await supabase
    .from('daily_todos')
    .upsert(
      {
        user_id: userId,
        todo_date: date,
        position,
        text,
        is_completed: false,
      },
      { onConflict: 'user_id,todo_date,position' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleDailyTodo(
  todoId: string,
  isCompleted: boolean
): Promise<void> {
  const { error } = await supabase
    .from('daily_todos')
    .update({ is_completed: !isCompleted })
    .eq('id', todoId);

  if (error) throw error;
}

export async function updateDailyTodoText(
  todoId: string,
  text: string
): Promise<void> {
  const { error } = await supabase
    .from('daily_todos')
    .update({ text })
    .eq('id', todoId);

  if (error) throw error;
}

export async function deleteDailyTodo(todoId: string): Promise<void> {
  const { error } = await supabase
    .from('daily_todos')
    .delete()
    .eq('id', todoId);

  if (error) throw error;
}
