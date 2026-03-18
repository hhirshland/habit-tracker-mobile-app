import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useThemeColors } from '@/hooks/useTheme';
import { theme } from '@/lib/theme';
import type { ThemeColors } from '@/lib/theme';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  isTyping?: boolean;
}

function TypingDots({ color }: { color: string }) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, easing: Easing.ease, useNativeDriver: true }),
        ]),
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start();
    a2.start();
    a3.start();

    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <View style={{ flexDirection: 'row', gap: 4, paddingVertical: 4 }}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: color,
            opacity: dot,
          }}
        />
      ))}
    </View>
  );
}

function ChatBubble({ role, content, isStreaming, isTyping }: ChatBubbleProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const mdStyles = useMemo(() => createMarkdownStyles(colors), [colors]);
  const isUser = role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        {isTyping ? (
          <TypingDots color={colors.textMuted} />
        ) : isUser ? (
          <Text style={[styles.text, styles.textUser]}>
            {content}
          </Text>
        ) : (
          <Markdown style={mdStyles}>
            {isStreaming ? content + '▊' : content}
          </Markdown>
        )}
      </View>
    </View>
  );
}

export default React.memo(ChatBubble);

function createMarkdownStyles(colors: ThemeColors) {
  return StyleSheet.create({
    body: {
      fontSize: theme.fontSize.md,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    strong: {
      fontWeight: theme.fontWeight.bold,
    },
    em: {
      fontStyle: 'italic',
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 6,
    },
    bullet_list: {
      marginTop: 4,
      marginBottom: 4,
    },
    ordered_list: {
      marginTop: 4,
      marginBottom: 4,
    },
    list_item: {
      marginBottom: 2,
    },
    bullet_list_icon: {
      color: colors.textMuted,
      fontSize: theme.fontSize.sm,
      lineHeight: 22,
      marginRight: 6,
    },
    ordered_list_icon: {
      color: colors.textMuted,
      fontSize: theme.fontSize.sm,
      lineHeight: 22,
      marginRight: 6,
    },
    heading1: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: 4,
      marginTop: 8,
    },
    heading2: {
      fontSize: theme.fontSize.md + 1,
      fontWeight: theme.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: 4,
      marginTop: 6,
    },
    heading3: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: 2,
      marginTop: 4,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      paddingLeft: theme.spacing.sm,
      marginVertical: 4,
      backgroundColor: 'transparent',
    },
    code_inline: {
      backgroundColor: colors.borderLight,
      borderRadius: 4,
      paddingHorizontal: 4,
      fontSize: theme.fontSize.sm,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    fence: {
      backgroundColor: colors.borderLight,
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
      marginVertical: 4,
      fontSize: theme.fontSize.sm,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    link: {
      color: colors.primary,
      textDecorationLine: 'underline',
    },
  });
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    rowUser: {
      justifyContent: 'flex-end',
    },
    rowAssistant: {
      justifyContent: 'flex-start',
    },
    bubble: {
      maxWidth: '80%',
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.sm + 2,
      paddingHorizontal: theme.spacing.md,
    },
    bubbleUser: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    text: {
      fontSize: theme.fontSize.md,
      lineHeight: 22,
    },
    textUser: {
      color: '#FFFFFF',
    },
  });
}
