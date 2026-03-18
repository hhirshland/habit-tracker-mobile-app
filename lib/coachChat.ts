import { fetch as expoFetch } from 'expo/fetch';
import { supabase } from './supabase';
import type { CoachConversation, CoachMessage } from './types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

export async function getConversations(): Promise<CoachConversation[]> {
  const { data, error } = await supabase
    .from('coach_conversations')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getMessages(conversationId: string): Promise<CoachMessage[]> {
  const { data, error } = await supabase
    .from('coach_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getLatestConversation(): Promise<CoachConversation | null> {
  const { data, error } = await supabase
    .from('coach_conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export interface StreamCallbacks {
  onText: (text: string) => void;
  onDone: (conversationId: string) => void | Promise<void>;
  onError: (error: string) => void;
}

export async function sendCoachMessage(
  params: {
    conversationId?: string;
    message?: string;
    start?: boolean;
  },
  callbacks: StreamCallbacks,
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    callbacks.onError('Not authenticated');
    return;
  }

  try {
    const response = await expoFetch(`${SUPABASE_URL}/functions/v1/coach-chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id: params.conversationId,
        message: params.message,
        start: params.start,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      callbacks.onError(`Request failed: ${response.status} ${body}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError('No response body');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data) continue;

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === 'text') {
            callbacks.onText(parsed.text);
          } else if (parsed.type === 'done') {
            await callbacks.onDone(parsed.conversation_id);
          }
        } catch {
          // Skip unparseable chunks
        }
      }
    }
  } catch (err) {
    callbacks.onError((err as Error).message);
  }
}
