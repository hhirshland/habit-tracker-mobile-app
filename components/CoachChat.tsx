import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useTheme';
import { theme } from '@/lib/theme';
import type { ThemeColors } from '@/lib/theme';
import { useCoachChat, useCoachMessages } from '@/hooks/useCoachChat';
import ChatBubble from './ChatBubble';
import DateSeparator from './DateSeparator';
import { captureEvent, EVENTS } from '@/lib/analytics';

const QUICK_ACTIONS = [
  'How am I doing this week?',
  'I need motivation',
  'Help me set better intentions',
  'I\'m struggling today',
];

type DisplayItem =
  | { type: 'message'; id: string; role: 'user' | 'assistant'; content: string }
  | { type: 'date'; id: string; date: string };

interface CoachChatProps {
  activeConversationId?: string;
  onConversationChange?: (id: string) => void;
}

export default function CoachChat({ activeConversationId, onConversationChange }: CoachChatProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const {
    send,
    streamingText,
    isStreaming,
    isWaitingForStream,
    optimisticUserMessage,
    conversationId,
    setConversationId,
    error,
  } = useCoachChat();

  const effectiveConversationId = activeConversationId ?? conversationId;
  const { data: messages = [] } = useCoachMessages(effectiveConversationId);

  // Sync external conversation ID (from history sheet)
  useEffect(() => {
    if (activeConversationId && activeConversationId !== conversationId) {
      setConversationId(activeConversationId);
    }
  }, [activeConversationId, conversationId, setConversationId]);

  // Notify parent of conversation changes
  useEffect(() => {
    if (conversationId && onConversationChange) {
      onConversationChange(conversationId);
    }
  }, [conversationId, onConversationChange]);

  // Track screen open
  const hasTracked = useRef(false);
  useEffect(() => {
    if (!hasTracked.current) {
      hasTracked.current = true;
      captureEvent(EVENTS.COACH_CHAT_OPENED, { source: 'tab' });
    }
  }, []);

  // Auto-greet: always start a fresh conversation when no activeConversationId is provided
  const hasGreeted = useRef(false);
  useEffect(() => {
    if (hasGreeted.current) return;
    if (activeConversationId) {
      hasGreeted.current = true;
      return;
    }
    hasGreeted.current = true;
    captureEvent(EVENTS.COACH_CONVERSATION_STARTED, { source: 'coach_greeting' });
    send({ start: true });
  }, [activeConversationId, send]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    captureEvent(EVENTS.COACH_MESSAGE_SENT, {
      conversation_id: effectiveConversationId ?? '',
      is_quick_action: false,
    });
    send({ conversationId: effectiveConversationId, message: text });
  }, [input, isStreaming, effectiveConversationId, send]);

  const handleQuickAction = useCallback(
    (action: string) => {
      if (isStreaming) return;
      captureEvent(EVENTS.COACH_MESSAGE_SENT, {
        conversation_id: effectiveConversationId ?? '',
        is_quick_action: true,
      });
      send({ conversationId: effectiveConversationId, message: action });
    },
    [isStreaming, effectiveConversationId, send],
  );

  // Only persisted messages — streaming state is rendered separately for performance
  const displayData = useMemo(() => {
    const filtered = messages.filter((m) => m.role === 'user' || m.role === 'assistant');

    const items: DisplayItem[] = [];
    let lastDate = '';

    for (const m of filtered) {
      const msgDate = m.created_at?.slice(0, 10) || '';
      if (msgDate && msgDate !== lastDate) {
        items.push({ type: 'date', id: `date-${msgDate}`, date: msgDate });
        lastDate = msgDate;
      }
      items.push({
        type: 'message',
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
      });
    }

    return items.reverse();
  }, [messages]);

  const renderItem = useCallback(
    ({ item }: { item: DisplayItem }) => {
      if (item.type === 'date') {
        return <DateSeparator date={item.date} />;
      }
      return <ChatBubble role={item.role} content={item.content} />;
    },
    [],
  );

  const showStreamingArea = !!(optimisticUserMessage || isWaitingForStream || streamingText);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 44}
    >
      <FlatList
        ref={flatListRef}
        data={displayData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        inverted
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          isStreaming || isWaitingForStream ? null : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏋️</Text>
              <Text style={styles.emptyTitle}>Your Thrive Coach</Text>
              <Text style={styles.emptySubtitle}>
                Ask me anything about your habits, goals, or identity. I'm here to push you forward.
              </Text>
            </View>
          )
        }
      />

      {showStreamingArea && (
        <View style={styles.streamingArea}>
          {optimisticUserMessage && (
            <ChatBubble role="user" content={optimisticUserMessage} />
          )}
          {isWaitingForStream ? (
            <ChatBubble role="assistant" content="" isTyping />
          ) : streamingText ? (
            <ChatBubble role="assistant" content={streamingText} isStreaming />
          ) : null}
        </View>
      )}

      {!isStreaming && !isWaitingForStream && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsContent}
          style={styles.quickActionsRow}
          keyboardShouldPersistTaps="handled"
        >
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action}
              style={styles.quickActionChip}
              onPress={() => handleQuickAction(action)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickActionText}>{action}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message your coach..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
          editable={!isStreaming}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || isStreaming) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isStreaming}
          activeOpacity={0.7}
        >
          {isStreaming ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <FontAwesome name="arrow-up" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    messageList: {
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxl,
      transform: [{ scaleY: -1 }],
    },
    emptyEmoji: {
      fontSize: 48,
      marginBottom: theme.spacing.md,
    },
    emptyTitle: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    emptySubtitle: {
      fontSize: theme.fontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    streamingArea: {
      paddingBottom: theme.spacing.xs,
    },
    quickActionsRow: {
      flexGrow: 0,
      flexShrink: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
    },
    quickActionsContent: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      gap: theme.spacing.sm,
      alignItems: 'center',
    },
    quickActionChip: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: theme.borderRadius.full,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      justifyContent: 'center',
    },
    quickActionText: {
      fontSize: theme.fontSize.sm,
      color: colors.primary,
      fontWeight: theme.fontWeight.medium,
      lineHeight: theme.fontSize.sm + 4,
    },
    errorBanner: {
      backgroundColor: colors.danger,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing.xs,
    },
    errorText: {
      color: '#fff',
      fontSize: theme.fontSize.sm,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
      backgroundColor: colors.background,
      gap: theme.spacing.sm,
    },
    input: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      fontSize: theme.fontSize.md,
      color: colors.textPrimary,
      maxHeight: 100,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.4,
    },
  });
}
