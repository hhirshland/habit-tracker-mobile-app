import { supabase } from './supabase';
import { IdentityStatement } from './types';

export async function getIdentityStatements(): Promise<IdentityStatement[]> {
  const { data, error } = await supabase
    .from('identity_statements')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createIdentityStatement(
  userId: string,
  statement: { statement: string; emoji: string; sort_order: number },
): Promise<IdentityStatement> {
  const { data, error } = await supabase
    .from('identity_statements')
    .insert({
      user_id: userId,
      statement: statement.statement,
      emoji: statement.emoji,
      sort_order: statement.sort_order,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createIdentityStatements(
  userId: string,
  statements: Array<{ statement: string; emoji: string; sort_order: number }>,
): Promise<IdentityStatement[]> {
  const rows = statements.map((s) => ({
    user_id: userId,
    statement: s.statement,
    emoji: s.emoji,
    sort_order: s.sort_order,
  }));

  const { data, error } = await supabase
    .from('identity_statements')
    .insert(rows)
    .select();

  if (error) throw error;
  return data || [];
}

export async function updateIdentityStatement(
  id: string,
  updates: { statement?: string; emoji?: string; sort_order?: number; is_active?: boolean },
): Promise<IdentityStatement> {
  const { data, error } = await supabase
    .from('identity_statements')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteIdentityStatement(id: string): Promise<void> {
  const { error } = await supabase
    .from('identity_statements')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}
