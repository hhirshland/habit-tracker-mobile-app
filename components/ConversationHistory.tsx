import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useThemeColors } from '@/hooks/useTheme';
import { theme } from '@/lib/theme';
import type { ThemeColors } from '@/lib/theme';
import type { CoachConversation } from '@/lib/types';
import { useCoachConversations } from '@/hooks/useCoachChat';

interface ConversationHistoryProps {
  visible: boolean;
  activeConversationId?: string;
  onSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  onClose: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getConversationTitle(convo: CoachConversation): string {
  if (convo.title) return convo.title;
  const date = new Date(convo.created_at);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ConversationHistory({
  visible,
  activeConversationId,
  onSelect,
  onNewConversation,
  onClose,
}: ConversationHistoryProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: conversations = [], isLoading } = useCoachConversations();

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleNew = useCallback(() => {
    onNewConversation();
    onClose();
  }, [onNewConversation, onClose]);

  const renderItem = useCallback(
    ({ item }: { item: CoachConversation }) => {
      const isActive = item.id === activeConversationId;
      return (
        <TouchableOpacity
          style={[styles.row, isActive && styles.rowActive]}
          onPress={() => handleSelect(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {getConversationTitle(item)}
            </Text>
            <Text style={styles.rowTime}>{formatRelativeTime(item.updated_at)}</Text>
          </View>
          {isActive && (
            <FontAwesome name="check" size={14} color={colors.primary} />
          )}
        </TouchableOpacity>
      );
    },
    [activeConversationId, colors.primary, handleSelect, styles],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <FontAwesome name="chevron-left" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Conversations</Text>
          <View style={{ width: 18 }} />
        </View>

        <TouchableOpacity style={styles.newButton} onPress={handleNew} activeOpacity={0.7}>
          <FontAwesome name="plus" size={14} color="#fff" />
          <Text style={styles.newButtonText}>New Conversation</Text>
        </TouchableOpacity>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No conversations yet</Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    headerTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: colors.textPrimary,
    },
    newButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: colors.primary,
      borderRadius: theme.borderRadius.lg,
    },
    newButtonText: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: '#fff',
    },
    list: {
      paddingHorizontal: theme.spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.xs,
    },
    rowActive: {
      backgroundColor: colors.surface,
    },
    rowContent: {
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    rowTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.medium,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    rowTime: {
      fontSize: theme.fontSize.sm,
      color: colors.textMuted,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: theme.fontSize.md,
      color: colors.textMuted,
    },
  });
}
