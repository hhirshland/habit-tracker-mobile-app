import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '@/lib/theme';

interface OfflineBannerProps {
  isOffline: boolean;
  pendingCount?: number;
}

export default function OfflineBanner({ isOffline, pendingCount = 0 }: OfflineBannerProps) {
  const slideAnim = useRef(new Animated.Value(isOffline ? 0 : -50)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOffline ? 0 : -50,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
    >
      <View style={styles.content}>
        <Text style={styles.text}>
          You're offline
          {pendingCount > 0 && ` \u00B7 ${pendingCount} change${pendingCount !== 1 ? 's' : ''} pending`}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.textSecondary,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    textAlign: 'center',
  },
});
