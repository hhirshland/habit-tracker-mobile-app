import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { theme } from '@/lib/theme';
import { DailyTodo } from '@/lib/types';
import DailyTodoItem from './DailyTodoItem';

interface Top3TodosSectionProps {
  todos: DailyTodo[];
  onSave: (position: number, text: string) => void;
  onToggle: (todo: DailyTodo) => void;
  onDelete: (todo: DailyTodo) => void;
}

export default function Top3TodosSection({
  todos,
  onSave,
  onToggle,
  onDelete,
}: Top3TodosSectionProps) {
  const todoByPosition = new Map(todos.map((t) => [t.position, t]));

  const handleDelete = (todo: DailyTodo) => {
    Alert.alert('Delete Todo', `Remove "${todo.text}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(todo) },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Top 3 Todos</Text>
      <View style={styles.card}>
        {[1, 2, 3].map((pos) => (
          <DailyTodoItem
            key={pos}
            todo={todoByPosition.get(pos) ?? null}
            position={pos}
            onSave={onSave}
            onToggle={onToggle}
            onDelete={handleDelete}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xs,
  },
  sectionLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.xs,
    ...theme.shadow.sm,
  },
});
