import React, { useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, ThemeColors } from '@/lib/theme';
import { IDENTITY_CATEGORIES } from '@/lib/identityTemplates';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 100;

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof FontAwesome>['name']> = {
  health: 'heartbeat',
  mindfulness: 'leaf',
  learning: 'graduation-cap',
  productivity: 'rocket',
  relationships: 'users',
  finance: 'line-chart',
  creativity: 'paint-brush',
};

export { CATEGORY_ICONS };

const OPTIONS = [
  ...IDENTITY_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    icon: (CATEGORY_ICONS[c.id] ?? 'star') as React.ComponentProps<typeof FontAwesome>['name'],
  })),
  { id: 'other', label: 'Other', icon: 'th-large' as React.ComponentProps<typeof FontAwesome>['name'] },
];

interface CategoryPickerProps {
  pendingStatement: string;
  onSelectCategory: (categoryId: string) => void;
  onDismiss: () => void;
  colors: ThemeColors;
}

export default function CategoryPicker({
  pendingStatement,
  onSelectCategory,
  onDismiss,
  colors,
}: CategoryPickerProps) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const translateY = useRef(new Animated.Value(0)).current;

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onDismiss());
  }, [onDismiss, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DISMISS_THRESHOLD || gesture.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }).start(() => onDismiss());
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <Modal transparent animationType="slide" statusBarTranslucent onRequestClose={dismiss}>
      <TouchableWithoutFeedback onPress={dismiss}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
              <View style={styles.handleZone} {...panResponder.panHandlers}>
                <View style={styles.handle} />
              </View>
              <Text style={styles.heading}>Categorize identity statement</Text>
              <View style={styles.statementRow}>
                <FontAwesome name="quote-left" size={14} color={colors.primary} />
                <Text style={styles.statementText}>{pendingStatement}</Text>
                <FontAwesome name="quote-right" size={14} color={colors.primary} />
              </View>
              <View style={styles.grid}>
                {OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={styles.card}
                    onPress={() => onSelectCategory(opt.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCircle}>
                      <FontAwesome name={opt.icon as any} size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.cardLabel}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      paddingBottom: theme.spacing.xl + 16,
      paddingHorizontal: theme.spacing.lg,
    },
    handleZone: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    heading: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    statementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: colors.primaryLightOverlay15,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    statementText: {
      flex: 1,
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      color: colors.primary,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    card: {
      width: '47%',
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primaryLightOverlay30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardLabel: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textPrimary,
      textAlign: 'center',
    },
  });
