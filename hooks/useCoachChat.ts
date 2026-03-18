import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMessages,
  getLatestConversation,
  getConversations,
  sendCoachMessage,
} from '@/lib/coachChat';
import type { CoachMessage, CoachConversation } from '@/lib/types';
import { queryKeys } from '@/lib/queryClient';

export function useCoachConversation() {
  return useQuery<CoachConversation | null>({
    queryKey: queryKeys.coachConversation,
    queryFn: getLatestConversation,
  });
}

export function useCoachConversations() {
  return useQuery<CoachConversation[]>({
    queryKey: queryKeys.coachConversations,
    queryFn: getConversations,
  });
}

export function useCoachMessages(conversationId: string | undefined) {
  return useQuery<CoachMessage[]>({
    queryKey: queryKeys.coachMessages(conversationId ?? ''),
    queryFn: () => getMessages(conversationId!),
    enabled: !!conversationId,
  });
}

export function useCoachChat() {
  const queryClient = useQueryClient();
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaitingForStream, setIsWaitingForStream] = useState(false);
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const accumulatedRef = useRef('');
  const lastFlushedRef = useRef('');
  const rafRef = useRef<number | null>(null);
  const waitingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const send = useCallback(
    async (params: { conversationId?: string; message?: string; start?: boolean }) => {
      setIsStreaming(true);
      setError(null);
      setStreamingText('');
      accumulatedRef.current = '';
      lastFlushedRef.current = '';
      waitingRef.current = true;

      if (params.message) {
        setOptimisticUserMessage(params.message);
      }
      setIsWaitingForStream(true);

      // Flush accumulated text to state at screen refresh rate instead of per-chunk
      const flushLoop = () => {
        if (accumulatedRef.current !== lastFlushedRef.current) {
          lastFlushedRef.current = accumulatedRef.current;
          setStreamingText(lastFlushedRef.current);
        }
        rafRef.current = requestAnimationFrame(flushLoop);
      };
      rafRef.current = requestAnimationFrame(flushLoop);

      const convoId = params.conversationId || conversationId;

      await sendCoachMessage(
        { ...params, conversationId: convoId },
        {
          onText: (text) => {
            if (waitingRef.current) {
              waitingRef.current = false;
              setIsWaitingForStream(false);
            }
            accumulatedRef.current += text;
          },
          onDone: async (newConversationId) => {
            if (rafRef.current !== null) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = null;
            }

            setConversationId(newConversationId);
            setIsWaitingForStream(false);

            // Load persisted messages before clearing streaming state to prevent flash
            await queryClient.invalidateQueries({
              queryKey: queryKeys.coachMessages(newConversationId),
            });

            setIsStreaming(false);
            setStreamingText('');
            setOptimisticUserMessage(null);

            queryClient.invalidateQueries({ queryKey: queryKeys.coachConversation });
            queryClient.invalidateQueries({ queryKey: queryKeys.coachConversations });
          },
          onError: (err) => {
            if (rafRef.current !== null) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = null;
            }
            setError(err);
            setIsStreaming(false);
            setIsWaitingForStream(false);
            setOptimisticUserMessage(null);
          },
        },
      );
    },
    [conversationId, queryClient],
  );

  const startNewConversation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setConversationId(undefined);
    setStreamingText('');
    setOptimisticUserMessage(null);
    setIsWaitingForStream(false);
    setError(null);
  }, []);

  return {
    send,
    streamingText,
    isStreaming,
    isWaitingForStream,
    optimisticUserMessage,
    conversationId,
    setConversationId,
    startNewConversation,
    error,
  };
}
