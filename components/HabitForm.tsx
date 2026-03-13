import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Keyboard,
  Pressable,
} from 'react-native';

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, type ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import {
  DAY_LABELS,
  DayOfWeek,
  HABIT_LINKABLE_METRICS,
  HealthMetricType,
  IdentityStatement,
  METRIC_TYPE_LABELS,
  METRIC_TYPE_DEFAULTS,
} from '@/lib/types';
import { useHealth } from '@/contexts/HealthContext';
import { CATEGORY_ICONS } from '@/components/CategoryPicker';
import { getCategoryIdForStatement } from '@/lib/identityTemplates';

interface HabitFormData {
  name: string;
  description: string;
  frequency_per_week: number;
  specific_days: number[] | null;
  metric_type: HealthMetricType | null;
  metric_threshold: number | null;
  auto_complete: boolean;
  identity_statement_id: string | null;
}

interface HabitFormProps {
  initialData?: Partial<HabitFormData>;
  onSubmit: (data: HabitFormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
  identityStatements?: IdentityStatement[];
  defaultIdentityId?: string | null;
  showDescription?: boolean;
}

export default function HabitForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Save Habit',
  identityStatements,
  defaultIdentityId,
  showDescription = true,
}: HabitFormProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isAvailable: healthAvailable, isAuthorized: healthAuthorized } = useHealth();

  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [frequencyPerWeek, setFrequencyPerWeek] = useState(initialData?.frequency_per_week || 7);
  const [useSpecificDays, setUseSpecificDays] = useState(
    initialData?.specific_days != null && initialData.specific_days.length > 0
  );
  const [specificDays, setSpecificDays] = useState<number[]>(initialData?.specific_days || []);
  const [selectedIdentityId, setSelectedIdentityId] = useState<string | null>(
    initialData?.identity_statement_id ?? defaultIdentityId ?? null,
  );

  // Health metric linking state
  const [linkMetric, setLinkMetric] = useState(initialData?.auto_complete || false);
  const [metricType, setMetricType] = useState<HealthMetricType | null>(
    initialData?.metric_type || null
  );
  const [metricThreshold, setMetricThreshold] = useState(
    initialData?.metric_threshold?.toString() || ''
  );

  const toggleDay = (day: number) => {
    setSpecificDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    const days = useSpecificDays ? specificDays : null;
    const freq = useSpecificDays ? specificDays.length : frequencyPerWeek;

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      frequency_per_week: freq,
      specific_days: days,
      metric_type: linkMetric ? metricType : null,
      metric_threshold: linkMetric && metricThreshold ? parseFloat(metricThreshold) : null,
      auto_complete: linkMetric,
      identity_statement_id: selectedIdentityId,
    });
  };

  return (
    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={styles.field}>
        <Text style={styles.label}>Habit Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Morning meditation"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          autoCapitalize="sentences"
        />
      </View>

      {showDescription && (
        <View style={styles.field}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add notes about this habit..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      )}

      {identityStatements && identityStatements.length > 0 && (
        <View style={styles.field}>
          <Text style={styles.label}>Which identity does this represent?</Text>
          <View style={styles.identityPicker}>
            <TouchableOpacity
              style={[
                styles.identityPill,
                selectedIdentityId === null && styles.identityPillActive,
              ]}
              onPress={() => setSelectedIdentityId(null)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.identityPillText,
                  selectedIdentityId === null && styles.identityPillTextActive,
                ]}
              >
                None
              </Text>
            </TouchableOpacity>
            {identityStatements.map((identity) => (
              <TouchableOpacity
                key={identity.id}
                style={[
                  styles.identityPill,
                  selectedIdentityId === identity.id && styles.identityPillActive,
                ]}
                onPress={() => setSelectedIdentityId(identity.id)}
                activeOpacity={0.7}
              >
                <FontAwesome
                  name={(CATEGORY_ICONS[getCategoryIdForStatement(identity.statement)] ?? 'star') as any}
                  size={14}
                  color={selectedIdentityId === identity.id ? '#fff' : colors.primary}
                />
                <Text
                  style={[
                    styles.identityPillText,
                    selectedIdentityId === identity.id && styles.identityPillTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {identity.statement.replace(/^I am\s*/i, '')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.field}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabelContainer}>
            <Text style={styles.label}>Specific days</Text>
            <Text style={styles.helperText}>
              {useSpecificDays
                ? 'Choose which days of the week'
                : 'Any days of the week'}
            </Text>
          </View>
          <Switch
            value={useSpecificDays}
            onValueChange={(val) => {
              setUseSpecificDays(val);
              if (!val) setSpecificDays([]);
            }}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor="#f4f3f4"
          />
        </View>
      </View>

      {useSpecificDays ? (
        <View style={styles.field}>
          <Text style={styles.label}>Select Days</Text>
          <View style={styles.daysRow}>
            {([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  specificDays.includes(day) && styles.dayButtonActive,
                ]}
                onPress={() => toggleDay(day)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    specificDays.includes(day) && styles.dayButtonTextActive,
                  ]}
                >
                  {DAY_LABELS[day]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.field}>
          <Text style={styles.label}>Times per week</Text>
          <View style={styles.frequencyRow}>
            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.frequencyButton,
                  frequencyPerWeek === num && styles.frequencyButtonActive,
                ]}
                onPress={() => setFrequencyPerWeek(num)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.frequencyButtonText,
                    frequencyPerWeek === num && styles.frequencyButtonTextActive,
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Health Metric Linking (only show if Apple Health is connected) */}
      {healthAvailable && healthAuthorized && (
        <>
          <View style={styles.field}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.label}>Link to Health Metric</Text>
                <Text style={styles.helperText}>
                  Auto-complete when a health target is met
                </Text>
              </View>
              <Switch
                value={linkMetric}
                onValueChange={(val) => {
                  setLinkMetric(val);
                  if (val && !metricType) {
                    setMetricType('steps');
                    setMetricThreshold(METRIC_TYPE_DEFAULTS['steps'].toString());
                  }
                }}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor="#f4f3f4"
              />
            </View>
          </View>

          {linkMetric && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Metric</Text>
                <View style={styles.metricRow}>
                  {HABIT_LINKABLE_METRICS.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.metricButton,
                        metricType === type && styles.metricButtonActive,
                      ]}
                      onPress={() => {
                        setMetricType(type);
                        setMetricThreshold(METRIC_TYPE_DEFAULTS[type].toString());
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.metricButtonText,
                          metricType === type && styles.metricButtonTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {METRIC_TYPE_LABELS[type].split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  Target ({metricType ? METRIC_TYPE_LABELS[metricType] : ''})
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 10000"
                  placeholderTextColor={colors.textMuted}
                  value={metricThreshold}
                  onChangeText={setMetricThreshold}
                  keyboardType="numeric"
                />
              </View>
            </>
          )}
        </>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.submitButton, !name.trim() && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!name.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>{submitLabel}</Text>
        </TouchableOpacity>

        {onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    field: {
      marginBottom: theme.spacing.lg,
    },
    label: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    helperText: {
      fontSize: theme.fontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 14,
      fontSize: theme.fontSize.md,
      color: colors.textPrimary,
    },
    textArea: {
      minHeight: 80,
      paddingTop: 14,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    switchLabelContainer: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    daysRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.xs,
    },
    dayButton: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    dayButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dayButtonText: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.medium,
      color: colors.textSecondary,
    },
    dayButtonTextActive: {
      color: '#fff',
    },
    frequencyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.xs,
    },
    frequencyButton: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    frequencyButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    frequencyButtonText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.medium,
      color: colors.textSecondary,
    },
    frequencyButtonTextActive: {
      color: '#fff',
    },
    actions: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xxl,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: 16,
      alignItems: 'center',
      ...theme.shadow.md,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: '#fff',
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
    },
    cancelButton: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: colors.textSecondary,
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.medium,
    },
    metricRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    metricButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    metricButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    metricButtonText: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.medium,
      color: colors.textSecondary,
    },
    metricButtonTextActive: {
      color: '#fff',
    },
    identityPicker: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    identityPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: theme.spacing.xs + 2,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    identityPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    identityPillIcon: {
      marginRight: 2,
    },
    identityPillText: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.medium,
      color: colors.textSecondary,
      maxWidth: 120,
    },
    identityPillTextActive: {
      color: '#fff',
    },
  });
}
