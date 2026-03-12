import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  LayoutAnimation,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { captureEvent, EVENTS } from '@/lib/analytics';
import {
  useIdentityStatements,
  useCreateIdentityStatements,
  useDeleteIdentityStatement,
} from '@/hooks/useIdentityQuery';
import type { IdentityStatement } from '@/lib/types';
import {
  IDENTITY_CATEGORIES,
  DEFAULT_CUSTOM_EMOJI,
  type IdentityTemplate,
} from '@/lib/identityTemplates';
import CategoryPicker, { CATEGORY_ICONS } from '@/components/CategoryPicker';

interface SelectedIdentity {
  statement: string;
  emoji: string;
  categoryId: string;
  isCustom: boolean;
}

export default function IdentitySetupScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { data: existing = [] } = useIdentityStatements();
  const createMutation = useCreateIdentityStatements();
  const deleteMutation = useDeleteIdentityStatement();

  const [selected, setSelected] = useState<SelectedIdentity[]>([]);
  const [customText, setCustomText] = useState('');
  const [pendingStatement, setPendingStatement] = useState<string | null>(null);

  const alreadySaved = useMemo(
    () => new Set(existing.map((e) => e.statement.toLowerCase())),
    [existing],
  );

  const toggleTemplate = useCallback((template: IdentityTemplate) => {
    setSelected((prev) => {
      const match = prev.find((s) => s.statement === template.statement);
      if (match) return prev.filter((s) => s !== match);
      return [
        ...prev,
        {
          statement: template.statement,
          emoji: template.emoji,
          categoryId: template.categoryId,
          isCustom: false,
        },
      ];
    });
  }, []);

  const handleCustomSubmit = useCallback(() => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    const statement = trimmed.startsWith('I am') ? trimmed : `I am ${trimmed}`;
    if (
      selected.some((s) => s.statement.toLowerCase() === statement.toLowerCase()) ||
      alreadySaved.has(statement.toLowerCase())
    )
      return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPendingStatement(statement);
  }, [customText, selected, alreadySaved]);

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

  const confirmDeleteIdentity = useCallback(
    (identity: IdentityStatement) => {
      Alert.alert(
        'Remove Identity',
        `Are you sure you want to remove "${identity.statement}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => deleteMutation.mutate({ id: identity.id }),
          },
        ],
      );
    },
    [deleteMutation],
  );

  const handleSave = useCallback(async () => {
    if (!user || selected.length === 0) return;
    try {
      await createMutation.mutateAsync({
        userId: user.id,
        statements: selected.map((s, i) => ({
          statement: s.statement,
          emoji: s.emoji,
          sort_order: existing.length + i,
        })),
      });
      const templateCount = selected.filter((s) => !s.isCustom).length;
      captureEvent(EVENTS.IDENTITY_ONBOARDING_COMPLETED, {
        identity_count: selected.length,
        template_count: templateCount,
        custom_count: selected.length - templateCount,
      });
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save identities. Please try again.');
    }
  }, [user, selected, existing.length, createMutation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <FontAwesome name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Define Your Identity</Text>
        <View style={{ width: 20 }} />
      </View>

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

          {existing.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Current Identities</Text>
              <View style={styles.tags}>
                {existing.map((identity) => (
                  <TouchableOpacity
                    key={identity.id}
                    style={styles.existingTag}
                    onPress={() => confirmDeleteIdentity(identity)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.existingTagText}>{identity.statement}</Text>
                    <FontAwesome name="times" size={12} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {selected.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Adding</Text>
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
                  const isExisting = alreadySaved.has(template.statement.toLowerCase());
                  const iconName = CATEGORY_ICONS[template.categoryId] ?? 'star';
                  return (
                    <TouchableOpacity
                      key={template.id}
                      style={[
                        styles.templateCard,
                        isSelected && styles.templateCardSelected,
                        isExisting && styles.templateCardExisting,
                      ]}
                      onPress={() => !isExisting && toggleTemplate(template)}
                      activeOpacity={isExisting ? 1 : 0.7}
                      disabled={isExisting}
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
                          isExisting && styles.templateStatementExisting,
                        ]}
                        numberOfLines={2}
                      >
                        {template.statement}
                      </Text>
                      {isSelected && (
                        <FontAwesome name="check-circle" size={18} color={colors.primary} style={styles.templateCheck} />
                      )}
                      {isExisting && (
                        <FontAwesome name="check" size={14} color={colors.textMuted} style={styles.templateCheck} />
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
            style={[styles.ctaButton, (selected.length === 0 || createMutation.isPending) && styles.ctaDisabled]}
            onPress={handleSave}
            disabled={selected.length === 0 || createMutation.isPending}
            activeOpacity={0.8}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Save {selected.length > 0 ? `(${selected.length})` : ''}</Text>
            )}
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
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
    topBarTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.semibold, color: colors.textPrimary },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
    header: { paddingTop: theme.spacing.sm, marginBottom: theme.spacing.lg },
    title: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: colors.textPrimary, marginBottom: theme.spacing.xs },
    subtitle: { fontSize: theme.fontSize.md, color: colors.textSecondary },
    section: { marginBottom: theme.spacing.lg },
    sectionLabel: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: theme.spacing.sm },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    existingTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.borderLight, borderRadius: theme.borderRadius.full, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs + 2 },
    existingTagText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: colors.textSecondary },
    selectedTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLightOverlay15, borderColor: colors.primary, borderWidth: 1, borderRadius: theme.borderRadius.full, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs + 2, gap: 6 },
    selectedTagText: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: colors.primary, maxWidth: 200 },
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
    templateCardExisting: { opacity: 0.5 },
    iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLightOverlay30, alignItems: 'center', justifyContent: 'center' },
    iconCircleSelected: { backgroundColor: colors.primary },
    templateStatement: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: colors.textPrimary, textAlign: 'center' },
    templateStatementSelected: { color: colors.primary },
    templateStatementExisting: { color: colors.textMuted },
    templateCheck: { position: 'absolute', top: 8, right: 8 },
    bottom: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, paddingTop: theme.spacing.sm },
    ctaButton: { backgroundColor: colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 18, alignItems: 'center', ...theme.shadow.md },
    ctaDisabled: { opacity: 0.5 },
    ctaText: { color: '#fff', fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.semibold },
  });
