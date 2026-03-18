import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useTheme';
import { theme } from '@/lib/theme';
import type { ThemeColors } from '@/lib/theme';
import AppHeader from '@/components/AppHeader';
import CoachChat from '@/components/CoachChat';
import ConversationHistory from '@/components/ConversationHistory';
import { captureEvent, EVENTS } from '@/lib/analytics';

export default function CoachScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  // Incrementing key forces CoachChat to remount with fresh state on new conversation
  const [chatKey, setChatKey] = useState(0);

  const handleOpenHistory = useCallback(() => {
    setHistoryVisible(true);
  }, []);

  const handleCloseHistory = useCallback(() => {
    setHistoryVisible(false);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setChatKey((k) => k + 1);
  }, []);

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(undefined);
    setChatKey((k) => k + 1);
    captureEvent(EVENTS.COACH_CONVERSATION_STARTED, { source: 'history_new' });
  }, []);

  const handleConversationChange = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <AppHeader
          title="Thrive Coach"
          showBack={false}
          showBorder={false}
          rightAction={{
            icon: 'clock-o',
            onPress: handleOpenHistory,
          }}
        />
      </View>
      <View style={styles.chatContainer}>
        <CoachChat
          key={chatKey}
          activeConversationId={activeConversationId}
          onConversationChange={handleConversationChange}
        />
      </View>

      <ConversationHistory
        visible={historyVisible}
        activeConversationId={activeConversationId}
        onSelect={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onClose={handleCloseHistory}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerRow: {
      paddingBottom: 0,
    },
    chatContainer: {
      flex: 1,
      paddingBottom: theme.spacing.tabBarClearance,
    },
  });
}
