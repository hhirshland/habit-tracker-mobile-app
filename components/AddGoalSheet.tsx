import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@/lib/theme';
import { GoalType, GOAL_TYPE_LABELS, GOAL_TYPE_ICONS, GOAL_TYPE_COLORS } from '@/lib/types';

// ──────────────────────────────────────────────
// Goal template definitions
// ──────────────────────────────────────────────

interface GoalTemplate {
  type: GoalType;
  label: string;
  icon: string;
  color: string;
  dataSource: 'apple_health' | 'manual';
  defaultUnit: string;
  description: string;
}

const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    type: 'weight',
    label: 'Target Weight',
    icon: 'balance-scale',
    color: '#2196F3',
    dataSource: 'apple_health',
    defaultUnit: 'lbs',
    description: 'Track weight from Apple Health with a weekly loss rate',
  },
  {
    type: 'body_fat',
    label: 'Body Fat %',
    icon: 'pie-chart',
    color: '#9C27B0',
    dataSource: 'apple_health',
    defaultUnit: '%',
    description: 'Track body fat percentage from Apple Health',
  },
  {
    type: 'bmi',
    label: 'BMI',
    icon: 'calculator',
    color: '#607D8B',
    dataSource: 'apple_health',
    defaultUnit: 'kg/m²',
    description: 'Track body mass index from Apple Health',
  },
  {
    type: 'lean_body_mass',
    label: 'Lean Body Mass',
    icon: 'child',
    color: '#00BCD4',
    dataSource: 'apple_health',
    defaultUnit: 'lbs',
    description: 'Track lean body mass from Apple Health',
  },
  {
    type: 'running_pr',
    label: 'Running PR',
    icon: 'clock-o',
    color: '#FF5722',
    dataSource: 'manual',
    defaultUnit: 'mm:ss',
    description: 'Set a target time for a running distance',
  },
  {
    type: 'steps',
    label: 'Daily Steps',
    icon: 'road',
    color: '#4CAF50',
    dataSource: 'apple_health',
    defaultUnit: 'steps',
    description: 'Hit a daily step count goal',
  },
  {
    type: 'resting_hr',
    label: 'Resting Heart Rate',
    icon: 'heartbeat',
    color: '#E91E63',
    dataSource: 'apple_health',
    defaultUnit: 'bpm',
    description: 'Lower your resting heart rate',
  },
  {
    type: 'weekly_workouts',
    label: 'Weekly Workouts',
    icon: 'bolt',
    color: '#F39C12',
    dataSource: 'apple_health',
    defaultUnit: 'workouts',
    description: 'Hit a target number of workouts per week',
  },
  {
    type: 'custom',
    label: 'Custom Goal',
    icon: 'star',
    color: '#6C63FF',
    dataSource: 'manual',
    defaultUnit: '',
    description: 'Create your own custom goal',
  },
];

const RUNNING_DISTANCES = [
  { label: '1 Mile', value: '1 Mile' },
  { label: '3 Miles', value: '3 Miles' },
  { label: '5K', value: '5K' },
  { label: '10K', value: '10K' },
  { label: 'Half Marathon', value: 'Half Marathon' },
  { label: 'Marathon', value: 'Marathon' },
];

const WEIGHT_RATES = [
  { label: '0.5 lbs/week', value: 0.5 },
  { label: '1 lb/week', value: 1 },
  { label: '1.5 lbs/week', value: 1.5 },
  { label: '2 lbs/week', value: 2 },
];

const START_DATE_PRESETS = [
  { id: 'today', label: 'Today', getDate: () => new Date() },
  {
    id: '1w',
    label: '1 week ago',
    getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d;
    },
  },
  {
    id: '1m',
    label: '1 month ago',
    getDate: () => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return d;
    },
  },
  {
    id: '3m',
    label: '3 months ago',
    getDate: () => {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      return d;
    },
  },
  { id: 'custom', label: 'Custom', getDate: () => new Date() },
];

function parseDateInput(text: string): Date | null {
  // Accept MM/DD/YYYY
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, mm, dd, yyyy] = match;
  const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  if (isNaN(d.getTime())) return null;
  // Sanity check: not in the future, not more than 5 years ago
  const now = new Date();
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  if (d > now || d < fiveYearsAgo) return null;
  return d;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

interface AddGoalSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (goal: {
    goal_type: GoalType;
    title: string;
    target_value: number;
    unit: string;
    start_value?: number | null;
    start_date?: string | null;
    rate?: number | null;
    rate_unit?: string | null;
    data_source: 'apple_health' | 'manual';
  }) => void;
  /** Current weight from Apple Health (auto-fill) */
  currentWeight?: number | null;
  /** Current body fat from Apple Health */
  currentBodyFat?: number | null;
  /** Current BMI from Apple Health */
  currentBMI?: number | null;
  /** Current lean mass from Apple Health */
  currentLeanMass?: number | null;
  /** Current resting HR */
  currentRHR?: number | null;
}

export default function AddGoalSheet({
  visible,
  onClose,
  onSubmit,
  currentWeight,
  currentBodyFat,
  currentBMI,
  currentLeanMass,
  currentRHR,
}: AddGoalSheetProps) {
  const [step, setStep] = useState<'pick' | 'form'>('pick');
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [startValue, setStartValue] = useState('');
  const [unit, setUnit] = useState('');
  const [selectedRate, setSelectedRate] = useState<number>(1);
  const [selectedDistance, setSelectedDistance] = useState('3 Miles');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [startDatePreset, setStartDatePreset] = useState<string>('today');
  const [customDateText, setCustomDateText] = useState('');

  const resetForm = () => {
    setStep('pick');
    setSelectedTemplate(null);
    setTitle('');
    setTargetValue('');
    setStartValue('');
    setUnit('');
    setSelectedRate(1);
    setSelectedDistance('3 Miles');
    setStartDate(new Date());
    setStartDatePreset('today');
    setCustomDateText('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectTemplate = (tmpl: GoalTemplate) => {
    setSelectedTemplate(tmpl);
    setStep('form');
    setUnit(tmpl.defaultUnit);

    // Pre-fill based on type
    switch (tmpl.type) {
      case 'weight':
        setTitle('Target Weight');
        setStartValue(currentWeight?.toString() ?? '');
        break;
      case 'body_fat':
        setTitle('Target Body Fat %');
        setStartValue(currentBodyFat?.toString() ?? '');
        break;
      case 'bmi':
        setTitle('Target BMI');
        setStartValue(currentBMI?.toString() ?? '');
        break;
      case 'lean_body_mass':
        setTitle('Target Lean Body Mass');
        setStartValue(currentLeanMass?.toString() ?? '');
        break;
      case 'resting_hr':
        setTitle('Target Resting HR');
        setStartValue(currentRHR?.toString() ?? '');
        break;
      case 'running_pr':
        setTitle(`${selectedDistance} PR`);
        break;
      case 'steps':
        setTitle('Daily Steps Goal');
        setTargetValue('10000');
        break;
      case 'weekly_workouts':
        setTitle('Weekly Workout Goal');
        setTargetValue('4');
        break;
      case 'custom':
        setTitle('');
        break;
    }
  };

  const handleSubmit = () => {
    if (!selectedTemplate) return;
    const tv = parseFloat(targetValue);
    if (isNaN(tv)) return;

    const sv = startValue ? parseFloat(startValue) : null;
    let goalTitle = title || GOAL_TYPE_LABELS[selectedTemplate.type];

    // Running PR: include distance in title
    if (selectedTemplate.type === 'running_pr') {
      goalTitle = `${selectedDistance} PR`;
    }

    const goalData: Parameters<typeof onSubmit>[0] = {
      goal_type: selectedTemplate.type,
      title: goalTitle,
      target_value: tv,
      unit: unit || selectedTemplate.defaultUnit,
      start_value: sv,
      start_date: startDate.toISOString(),
      data_source: selectedTemplate.dataSource,
    };

    // Add rate for weight goals
    if (selectedTemplate.type === 'weight' && selectedRate > 0) {
      goalData.rate = selectedRate;
      goalData.rate_unit = 'lbs/week';
    }

    onSubmit(goalData);
    handleClose();
  };

  const canSubmit = (): boolean => {
    if (!selectedTemplate) return false;
    const tv = parseFloat(targetValue);
    if (isNaN(tv)) return false;
    if (selectedTemplate.type === 'custom' && !title.trim()) return false;
    return true;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={step === 'form' ? () => setStep('pick') : handleClose}>
            <Text style={styles.modalHeaderButton}>
              {step === 'form' ? 'Back' : 'Cancel'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {step === 'pick' ? 'Add Goal' : selectedTemplate?.label ?? 'New Goal'}
          </Text>
          <View style={{ minWidth: 60 }} />
        </View>

        {step === 'pick' ? (
          <ScrollView style={styles.templateList} contentContainerStyle={styles.templateListContent}>
            {GOAL_TEMPLATES.map((tmpl) => (
              <TouchableOpacity
                key={tmpl.type}
                style={styles.templateRow}
                onPress={() => handleSelectTemplate(tmpl)}
                activeOpacity={0.7}
              >
                <View style={[styles.templateIcon, { backgroundColor: tmpl.color + '18' }]}>
                  <FontAwesome name={tmpl.icon as any} size={18} color={tmpl.color} />
                </View>
                <View style={styles.templateInfo}>
                  <Text style={styles.templateLabel}>{tmpl.label}</Text>
                  <Text style={styles.templateDesc}>{tmpl.description}</Text>
                </View>
                <FontAwesome name="chevron-right" size={12} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
            {/* Running PR: distance picker */}
            {selectedTemplate?.type === 'running_pr' && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Distance</Text>
                <View style={styles.chipRow}>
                  {RUNNING_DISTANCES.map((d) => (
                    <TouchableOpacity
                      key={d.value}
                      style={[
                        styles.chip,
                        selectedDistance === d.value && styles.chipSelected,
                      ]}
                      onPress={() => {
                        setSelectedDistance(d.value);
                        setTitle(`${d.value} PR`);
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedDistance === d.value && styles.chipTextSelected,
                        ]}
                      >
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Title (editable for custom, pre-filled for others) */}
            {selectedTemplate?.type === 'custom' && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Goal Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Max Bench Press"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            )}

            {/* Custom: unit */}
            {selectedTemplate?.type === 'custom' && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Unit</Text>
                <TextInput
                  style={styles.textInput}
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="e.g. lbs, reps, minutes"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            )}

            {/* Current / start value (auto-filled for Apple Health goals) */}
            {selectedTemplate?.dataSource === 'apple_health' && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Current Value</Text>
                <TextInput
                  style={styles.textInput}
                  value={startValue}
                  onChangeText={setStartValue}
                  placeholder="Auto-filled from Apple Health"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="decimal-pad"
                />
                {startValue && (
                  <Text style={styles.formHint}>
                    From Apple Health: {startValue} {selectedTemplate.defaultUnit}
                  </Text>
                )}
              </View>
            )}

            {/* Manual goals: current value input */}
            {selectedTemplate?.dataSource === 'manual' && selectedTemplate?.type !== 'running_pr' && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Current Value (optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={startValue}
                  onChangeText={setStartValue}
                  placeholder="Where you're at now"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            )}

            {/* Running PR: current time */}
            {selectedTemplate?.type === 'running_pr' && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Current Time (minutes)</Text>
                <TextInput
                  style={styles.textInput}
                  value={startValue}
                  onChangeText={setStartValue}
                  placeholder="e.g. 24.5 (for 24:30)"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            )}

            {/* Target value */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>
                Target {selectedTemplate?.type === 'running_pr' ? 'Time (minutes)' : 'Value'}
              </Text>
              <TextInput
                style={styles.textInput}
                value={targetValue}
                onChangeText={setTargetValue}
                placeholder={
                  selectedTemplate?.type === 'running_pr'
                    ? 'e.g. 21.0 (for 21:00)'
                    : selectedTemplate?.type === 'steps'
                    ? '10000'
                    : `Target ${selectedTemplate?.defaultUnit ?? ''}`
                }
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Weight: rate picker */}
            {selectedTemplate?.type === 'weight' && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Weight Loss Rate</Text>
                <View style={styles.chipRow}>
                  {WEIGHT_RATES.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[
                        styles.chip,
                        selectedRate === r.value && styles.chipSelected,
                      ]}
                      onPress={() => setSelectedRate(r.value)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedRate === r.value && styles.chipTextSelected,
                        ]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Start date */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Start Date</Text>
              <View style={styles.chipRow}>
                {START_DATE_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.chip,
                      startDatePreset === preset.id && styles.chipSelected,
                    ]}
                    onPress={() => {
                      setStartDatePreset(preset.id);
                      setStartDate(preset.getDate());
                      setCustomDateText('');
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        startDatePreset === preset.id && styles.chipTextSelected,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {startDatePreset === 'custom' && (
                <TextInput
                  style={[styles.textInput, { marginTop: theme.spacing.sm }]}
                  value={customDateText}
                  onChangeText={(text) => {
                    setCustomDateText(text);
                    // Try parsing MM/DD/YYYY
                    const parsed = parseDateInput(text);
                    if (parsed) setStartDate(parsed);
                  }}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
              )}
              <Text style={styles.formHint}>
                {formatDisplayDate(startDate)}
              </Text>
            </View>

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitButton, !canSubmit() && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit()}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>Create Goal</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalHeaderButton: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
    minWidth: 60,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },

  // Template picker
  templateList: {
    flex: 1,
  },
  templateListContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.sm,
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  templateInfo: {
    flex: 1,
  },
  templateLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  templateDesc: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },

  // Form
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  formSection: {
    marginBottom: theme.spacing.lg,
  },
  formLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  formHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  chipTextSelected: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    ...theme.shadow.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
});
