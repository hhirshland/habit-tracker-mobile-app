import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, type ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Habit, HealthMetricType } from '@/lib/types';
import {
  useHabits,
  useCreateHabit,
  useUpdateHabit,
  useDeleteHabit,
} from '@/hooks/useHabitsQuery';
import HabitItem from '@/components/HabitItem';
import HabitForm from '@/components/HabitForm';

export default function HabitsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // ── Queries & mutations (cached) ──
  const { data: habits = [], isLoading: loading, refetch } = useHabits();
  const createMutation = useCreateHabit();
  const updateMutation = useUpdateHabit();
  const deleteMutation = useDeleteHabit();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCreate = async (data: {
    name: string;
    description: string;
    frequency_per_week: number;
    specific_days: number[] | null;
    metric_type: HealthMetricType | null;
    metric_threshold: number | null;
    auto_complete: boolean;
  }) => {
    if (!user) return;
    try {
      await createMutation.mutateAsync({
        userId: user.id,
        habit: {
          name: data.name,
          description: data.description || undefined,
          frequency_per_week: data.frequency_per_week,
          specific_days: data.specific_days,
          metric_type: data.metric_type,
          metric_threshold: data.metric_threshold,
          auto_complete: data.auto_complete,
        },
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error creating habit:', error);
      Alert.alert('Error', 'Failed to create habit');
    }
  };

  const handleUpdate = async (data: {
    name: string;
    description: string;
    frequency_per_week: number;
    specific_days: number[] | null;
    metric_type: HealthMetricType | null;
    metric_threshold: number | null;
    auto_complete: boolean;
  }) => {
    if (!editingHabit) return;
    try {
      await updateMutation.mutateAsync({
        habitId: editingHabit.id,
        updates: {
          name: data.name,
          description: data.description || null,
          frequency_per_week: data.frequency_per_week,
          specific_days: data.specific_days,
          metric_type: data.metric_type,
          metric_threshold: data.metric_threshold,
          auto_complete: data.auto_complete,
        },
      });
      setEditingHabit(null);
    } catch (error) {
      console.error('Error updating habit:', error);
      Alert.alert('Error', 'Failed to update habit');
    }
  };

  const handleDelete = (habit: Habit) => {
    Alert.alert('Delete Habit', `Are you sure you want to delete "${habit.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync({
              habitId: habit.id,
              habitName: habit.name,
            });
          } catch (error) {
            console.error('Error deleting habit:', error);
            Alert.alert('Error', 'Failed to delete habit');
          }
        },
      },
    ]);
  };

  // Only show full-screen spinner on very first load (no cached data)
  if (loading && habits.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Habits</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(true)}
          activeOpacity={0.8}
        >
          <FontAwesome name="plus" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {habits.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📝</Text>
          <Text style={styles.emptyTitle}>No habits yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the button below to add your first habit
          </Text>
          <TouchableOpacity
            style={styles.addHabitButton}
            onPress={() => setShowForm(true)}
            activeOpacity={0.8}
          >
            <FontAwesome name="plus" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.addHabitButtonText}>Add Habit</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.itemWrapper}>
              <HabitItem
                habit={item}
                onEdit={() => setEditingHabit(item)}
                onDelete={() => handleDelete(item)}
              />
            </View>
          )}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.addHabitButton}
              onPress={() => setShowForm(true)}
              activeOpacity={0.8}
            >
              <FontAwesome name="plus" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.addHabitButtonText}>Add Habit</Text>
            </TouchableOpacity>
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Add Habit Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForm(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Habit</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <FontAwesome name="times" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <HabitForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              submitLabel="Create Habit"
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Habit Modal */}
      <Modal
        visible={editingHabit !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingHabit(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Habit</Text>
            <TouchableOpacity onPress={() => setEditingHabit(null)}>
              <FontAwesome name="times" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            {editingHabit && (
              <HabitForm
                initialData={{
                  name: editingHabit.name,
                  description: editingHabit.description || '',
                  frequency_per_week: editingHabit.frequency_per_week,
                  specific_days: editingHabit.specific_days,
                  metric_type: editingHabit.metric_type,
                  metric_threshold: editingHabit.metric_threshold,
                  auto_complete: editingHabit.auto_complete,
                }}
                onSubmit={handleUpdate}
                onCancel={() => setEditingHabit(null)}
                submitLabel="Update Habit"
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.fontSize.xxl,
      fontWeight: theme.fontWeight.bold,
      color: colors.textPrimary,
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadow.md,
    },
    list: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.tabBarClearance,
    },
    itemWrapper: {
      marginBottom: theme.spacing.sm,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    emptyEmoji: {
      fontSize: 56,
      marginBottom: theme.spacing.md,
    },
    emptyTitle: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    emptySubtitle: {
      fontSize: theme.fontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    addHabitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      marginTop: theme.spacing.lg,
      ...theme.shadow.md,
    },
    addHabitButtonText: {
      color: '#fff',
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      color: colors.textPrimary,
    },
    modalContent: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
  });
}
