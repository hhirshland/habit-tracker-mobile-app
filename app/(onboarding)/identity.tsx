import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { captureEvent, EVENTS } from '@/lib/analytics';
import OnboardingProgress from '@/components/OnboardingProgress';
import CategoryPicker, { CATEGORY_ICONS } from '@/components/CategoryPicker';
import {
  IDENTITY_CATEGORIES,
  DEFAULT_CUSTOM_EMOJI,
  type IdentityTemplate,
} from '@/lib/identityTemplates';

export interface SelectedIdentity {
  statement: string;
  emoji: string;
  categoryId: string;
  suggestedHabits: Array<{ name: string; frequency_per_week: number }>;
  isCustom: boolean;
}

export default function IdentityScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams();
  const [selected, setSelected] = useState<SelectedIdentity[]>([]);
  const [customText, setCustomText] = useState('');
  const [pendingStatement, setPendingStatement] = useState<string | null>(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    captureEvent(EVENTS.ONBOARDING_STEP_VIEWED, { step_name: 'identity', step_number: 3 });
  }, []);

  const toggleTemplate = useCallback((template: IdentityTemplate) => {
    setSelected((prev) => {
      const existing = prev.find(
        (s) => !s.isCustom && s.statement === template.statement,
      );
      if (existing) return prev.filter((s) => s !== existing);
      return [
        ...prev,
        {
          statement: template.statement,
          emoji: template.emoji,
          categoryId: template.categoryId,
          suggestedHabits: template.suggestedHabits,
          isCustom: false,
        },
      ];
    });
  }, []);

  const handleCustomSubmit = useCallback(() => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    const statement = trimmed.startsWith('I am') ? trimmed : `I am ${trimmed}`;
    if (selected.some((s) => s.statement.toLowerCase() === statement.toLowerCase())) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPendingStatement(statement);
  }, [customText, selected]);

  const assignCategory = useCallback(
    (categoryId: string) => {
      if (!pendingStatement) return;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSelected((prev) => [
        ...prev,
        {
          statement: pendingStatement,
          emoji: DEFAULT_CUSTOM_EMOJI,
          categoryId,
          suggestedHabits: [],
          isCustom: true,
        },
      ]);
      setPendingStatement(null);
      setCustomText('');
    },
    [pendingStatement],
  );

  const dismissCategoryPicker = useCallback(() => {
    if (!pendingStatement) return;
    setPendingStatement(null);
  }, [pendingStatement]);

  const removeIdentity = useCallback((statement: string) => {
    setSelected((prev) => prev.filter((s) => s.statement !== statement));
  }, []);

  const handleContinue = () => {
    captureEvent(EVENTS.ONBOARDING_STEP_COMPLETED, {
      step_name: 'identity',
      step_number: 3,
      duration_seconds: Math.round((Date.now() - startTime.current) / 1000),
    });
    const templateCount = selected.filter((s) => !s.isCustom).length;
    captureEvent(EVENTS.IDENTITY_ONBOARDING_COMPLETED, {
      identity_count: selected.length,
      template_count: templateCount,
      custom_count: selected.length - templateCount,
    });
    router.push({
      pathname: '/(onboarding)/habits',
      params: {
        identities: JSON.stringify(selected),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress current={3} total={5} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Who do you want{'\n'}to be?</Text>
            <Text style={styles.subtitle}>
              Select identities that resonate, or write your own
            </Text>
          </View>

          {selected.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Selected</Text>
              <View style={styles.tags}>
                {selected.map((identity) => {
                  const iconName = CATEGORY_ICONS[identity.categoryId] ?? 'star';
                  return (
                    <TouchableOpacity
                      key={identity.statement}
                      style={styles.selectedTag}
                      onPress={() => removeIdentity(identity.statement)}
                      activeOpacity={0.7}
                    >
                      <FontAwesome name={iconName} size={12} color={colors.primary} />
                      <Text style={styles.selectedTagText} numberOfLines={1}>
                        {identity.statement}
                      </Text>
                      <FontAwesome name="times" size={12} color={colors.primary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
              {selected.length >= 4 && (
                <Text style={styles.nudgeText}>
                  Focus is power — 2-3 identities is the sweet spot
                </Text>
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Write Your Own</Text>
            <View style={styles.customInputRow}>
              <Text style={styles.customPrefix}>I am</Text>
              <TextInput
                style={styles.customInput}
                value={customText}
                onChangeText={setCustomText}
                placeholder="a morning person..."
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                onSubmitEditing={handleCustomSubmit}
                editable={!pendingStatement}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.addButton, (!customText.trim() || !!pendingStatement) && styles.addButtonDisabled]}
                onPress={handleCustomSubmit}
                disabled={!customText.trim() || !!pendingStatement}
                activeOpacity={0.7}
              >
                <FontAwesome name="plus" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {IDENTITY_CATEGORIES.map((category) => (
            <View key={category.id} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <FontAwesome name={category.icon as any} size={14} color={colors.textSecondary} />
                <Text style={styles.categoryLabel}>{category.label}</Text>
              </View>
              <View style={styles.templateGrid}>
                {category.templates.map((template) => {
                  const isSelected = selected.some((s) => s.statement === template.statement);
                  const iconName = CATEGORY_ICONS[template.categoryId] ?? 'star';
                  return (
                    <TouchableOpacity
                      key={template.id}
                      style={[
                        styles.templateCard,
                        isSelected && styles.templateCardSelected,
                      ]}
                      onPress={() => toggleTemplate(template)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
                        <FontAwesome
                          name={iconName}
                          size={18}
                          color={isSelected ? '#fff' : colors.primary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.templateStatement,
                          isSelected && styles.templateStatementSelected,
                        ]}
                        numberOfLines={2}
                      >
                        {template.statement}
                      </Text>
                      {isSelected && (
                        <FontAwesome name="check-circle" size={18} color={colors.primary} style={styles.templateCheck} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={[styles.ctaButton, selected.length === 0 && styles.ctaDisabled]}
            onPress={handleContinue}
            disabled={selected.length === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {pendingStatement && (
        <CategoryPicker
          pendingStatement={pendingStatement}
          onSelectCategory={assignCategory}
          onDismiss={dismissCategoryPicker}
          colors={colors}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
    header: { paddingTop: theme.spacing.md, marginBottom: theme.spacing.lg },
    title: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: colors.textPrimary, marginBottom: theme.spacing.xs },
    subtitle: { fontSize: theme.fontSize.md, color: colors.textSecondary },
    section: { marginBottom: theme.spacing.lg },
    sectionLabel: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: theme.spacing.sm },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    selectedTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLightOverlay15, borderColor: colors.primary, borderWidth: 1, borderRadius: theme.borderRadius.full, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs + 2, gap: 6 },
    selectedTagText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: colors.primary, maxWidth: 200 },
    nudgeText: { fontSize: theme.fontSize.xs, color: colors.textMuted, fontStyle: 'italic', marginTop: theme.spacing.xs },
    customInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: theme.borderRadius.md, paddingLeft: theme.spacing.md, gap: theme.spacing.xs },
    customPrefix: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: colors.textPrimary },
    customInput: { flex: 1, fontSize: theme.fontSize.md, color: colors.textPrimary, paddingVertical: 14 },
    addButton: { backgroundColor: colors.primary, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
    addButtonDisabled: { opacity: 0.4 },
    categorySection: { marginBottom: theme.spacing.lg },
    categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.sm },
    categoryLabel: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    templateCard: { width: '47.5%', backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', gap: theme.spacing.sm },
    templateCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLightOverlay15 },
    iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLightOverlay30, alignItems: 'center', justifyContent: 'center' },
    iconCircleSelected: { backgroundColor: colors.primary },
    templateStatement: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: colors.textPrimary, textAlign: 'center' },
    templateStatementSelected: { color: colors.primary },
    templateCheck: { position: 'absolute', top: 8, right: 8 },
    bottom: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, paddingTop: theme.spacing.sm },
    ctaButton: { backgroundColor: colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 18, alignItems: 'center', ...theme.shadow.md },
    ctaDisabled: { opacity: 0.5 },
    ctaText: { color: '#fff', fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.semibold },
  });
