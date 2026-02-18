import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '@/lib/theme';

const TAB_ICONS: Record<string, React.ComponentProps<typeof FontAwesome>['name']> = {
  index: 'home',
  progress: 'bar-chart',
  habits: 'list-ul',
  profile: 'user-circle-o',
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  return (
    <View
      style={[
        styles.tabBarWrapper,
        { paddingBottom: Math.max(insets.bottom - 8, 4) },
      ]}
    >
      <View style={styles.tabBarPill}>
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
          const color = isFocused ? theme.colors.textPrimary : theme.colors.textMuted;

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
              {isFocused && <View style={styles.activeHighlight} />}
              {route.name === 'profile' && profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={[
                    styles.profilePic,
                    { borderColor: isFocused ? '#1A1A1A' : '#B0B0B0' },
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
      <Tabs.Screen name="habits" options={{ title: 'My Habits' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: theme.colors.surface,
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
    top: -2,
    bottom: -2,
    left: 1,
    right: 1,
    backgroundColor: theme.colors.borderLight,
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
