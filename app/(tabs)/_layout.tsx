import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeColors } from '@/hooks/useTheme';
import { Sentry } from '@/lib/sentry';
import { hapticSelection } from '@/lib/haptics';

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  Sentry.captureException(error);
  return (
    <View style={ebStyles.container}>
      <Text style={ebStyles.title}>Something went wrong</Text>
      <Text style={ebStyles.message}>We hit a snag loading this section. Please try again.</Text>
      <TouchableOpacity style={ebStyles.button} onPress={retry}>
        <Text style={ebStyles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const ebStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  message: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#4A90E2', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

const TAB_ICONS: Record<string, React.ComponentProps<typeof FontAwesome>['name']> = {
  index: 'home',
  progress: 'bar-chart',
  profile: 'user-circle-o',
};

const TIMING_CONFIG = { duration: 250, easing: Easing.out(Easing.cubic) };
const PILL_PADDING_H = 6;
const HIGHLIGHT_INSET = 1;

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { profile } = useAuth();

  const [pillWidth, setPillWidth] = useState(0);
  const numTabs = state.routes.length;
  const tabWidth = pillWidth > 0 ? (pillWidth - PILL_PADDING_H * 2) / numTabs : 0;

  const indicatorX = useSharedValue(0);
  const hasPlaced = useRef(false);

  useEffect(() => {
    if (tabWidth <= 0) return;
    const target = PILL_PADDING_H + HIGHLIGHT_INSET + state.index * tabWidth;
    if (!hasPlaced.current) {
      indicatorX.value = target;
      hasPlaced.current = true;
    } else {
      indicatorX.value = withTiming(target, TIMING_CONFIG);
    }
  }, [state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: tabWidth > 0 ? tabWidth - HIGHLIGHT_INSET * 2 : 0,
  }));

  const onPillLayout = useCallback((e: LayoutChangeEvent) => {
    setPillWidth(e.nativeEvent.layout.width);
  }, []);

  return (
    <View
      style={[
        styles.tabBarWrapper,
        { paddingBottom: Math.max(insets.bottom - 8, 4) },
      ]}
    >
      <View style={styles.tabBarPill} onLayout={onPillLayout}>
        {pillWidth > 0 && (
          <Animated.View style={[styles.activeHighlight, indicatorStyle]} />
        )}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              hapticSelection();
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const iconName = TAB_ICONS[route.name] ?? 'circle';
          const color = isFocused ? colors.textPrimary : colors.textMuted;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              {route.name === 'profile' && profile?.avatar_url ? (
                <Image
                  source={profile.avatar_url}
                  style={[
                    styles.profilePic,
                    { borderColor: isFocused ? colors.textPrimary : colors.textMuted },
                  ]}
                />
              ) : (
                <FontAwesome
                  name={iconName}
                  size={24}
                  color={color}
                  style={{ zIndex: 1 }}
                />
              )}
              <Text
                style={[
                  styles.tabLabel,
                  { color, fontWeight: isFocused ? '600' : '400' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

function createStyles(colors: import('@/lib/theme').ThemeColors) {
  return StyleSheet.create({
    tabBarWrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: 16,
      backgroundColor: 'transparent',
    },
    tabBarPill: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 32,
      paddingVertical: 8,
      paddingHorizontal: 6,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 8,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      position: 'relative',
    },
    activeHighlight: {
      position: 'absolute',
      top: 6,
      bottom: 6,
      left: 0,
      backgroundColor: colors.borderLight,
      borderRadius: 24,
    },
    profilePic: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1.5,
      zIndex: 1,
    },
    tabLabel: {
      fontSize: 10,
      marginTop: 3,
      zIndex: 1,
    },
  });
}
