import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { ALL_METRICS, MetricDefinition } from '@/lib/metricsConfig';

interface EditMetricsSheetProps {
  visible: boolean;
  visibleKeys: string[];
  onClose: () => void;
  onSave: (visibleKeys: string[]) => void;
}

interface MetricItem {
  metric: MetricDefinition;
  visible: boolean;
}

export default function EditMetricsSheet({
  visible,
  visibleKeys,
  onClose,
  onSave,
}: EditMetricsSheetProps) {
  const colors = useThemeColors();
  // Build the ordered list: visible keys in order first, then hidden ones
  const [items, setItems] = useState<MetricItem[]>(() => buildItemList(visibleKeys));

  // Re-sync when the sheet opens
  React.useEffect(() => {
    if (visible) {
      setItems(buildItemList(visibleKeys));
    }
  }, [visible, visibleKeys]);

  const toggleVisibility = useCallback((key: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.metric.key === key ? { ...item, visible: !item.visible } : item
      )
    );
  }, []);

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setItems((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const handleSave = () => {
    const newVisibleKeys = items
      .filter((item) => item.visible)
      .map((item) => item.metric.key);
    onSave(newVisibleKeys);
    onClose();
  };

  const handleCancel = () => {
    setItems(buildItemList(visibleKeys)); // Reset changes
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Metrics</Text>
          <TouchableOpacity onPress={handleSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.saveButton}>Done</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          Toggle metrics on or off, and use the arrows to reorder.
        </Text>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {items.map((item, index) => (
            <View
              key={item.metric.key}
              style={[styles.row, !item.visible && styles.rowHidden]}
            >
              {/* Icon and title */}
              <View style={styles.rowLeft}>
                <View
                  style={[
                    styles.metricIcon,
                    { backgroundColor: item.visible ? `${item.metric.color}18` : theme.colors.textMutedOverlay18 },
                  ]}
                >
                  <FontAwesome
                    name={item.metric.icon}
                    size={14}
                    color={item.visible ? item.metric.color : theme.colors.textMuted}
                  />
                </View>
                <Text
                  style={[
                    styles.metricTitle,
                    !item.visible && styles.metricTitleHidden,
                  ]}
                >
                  {item.metric.title}
                </Text>
              </View>

              {/* Controls */}
              <View style={styles.rowRight}>
                {/* Reorder arrows */}
                <View style={styles.arrows}>
                  <TouchableOpacity
                    onPress={() => moveUp(index)}
                    disabled={index === 0}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={[styles.arrowButton, index === 0 && styles.arrowDisabled]}
                  >
                    <FontAwesome
                      name="chevron-up"
                      size={12}
                      color={index === 0 ? theme.colors.borderLight : theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveDown(index)}
                    disabled={index === items.length - 1}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={[
                      styles.arrowButton,
                      index === items.length - 1 && styles.arrowDisabled,
                    ]}
                  >
                    <FontAwesome
                      name="chevron-down"
                      size={12}
                      color={
                        index === items.length - 1
                          ? theme.colors.borderLight
                          : theme.colors.textSecondary
                      }
                    />
                  </TouchableOpacity>
                </View>

                {/* Toggle */}
                <Switch
                  value={item.visible}
                  onValueChange={() => toggleVisibility(item.metric.key)}
                  trackColor={{
                    false: colors.borderLight,
                    true: colors.primaryOverlay60,
                  }}
                  thumbColor={item.visible ? colors.primary : '#f4f3f4'}
                  ios_backgroundColor={colors.borderLight}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

/**
 * Build the ordered item list: visible keys first (in their order),
 * then any remaining metrics that aren't visible.
 */
function buildItemList(visibleKeys: string[]): MetricItem[] {
  const visibleSet = new Set(visibleKeys);
  const items: MetricItem[] = [];

  // Add visible metrics in their specified order
  for (const key of visibleKeys) {
    const metric = ALL_METRICS.find((m) => m.key === key);
    if (metric) {
      items.push({ metric, visible: true });
    }
  }

  // Add hidden metrics at the end (in default order)
  for (const metric of ALL_METRICS) {
    if (!visibleSet.has(metric.key)) {
      items.push({ metric, visible: false });
    }
  }

  return items;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  cancelButton: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  saveButton: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
    minWidth: 60,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 120,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadow.sm,
  },
  rowHidden: {
    opacity: 0.6,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  metricTitleHidden: {
    color: theme.colors.textMuted,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  arrows: {
    gap: 2,
  },
  arrowButton: {
    padding: 4,
    alignItems: 'center',
  },
  arrowDisabled: {
    opacity: 0.3,
  },
});
