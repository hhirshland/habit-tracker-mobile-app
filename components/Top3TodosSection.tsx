import React, { useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { DailyTodo } from '@/lib/types';
import DailyTodoItem, { DailyTodoItemHandle } from './DailyTodoItem';

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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const todoByPosition = new Map(todos.map((t) => [t.position, t]));

  const itemRefs = useRef<(DailyTodoItemHandle | null)[]>([null, null, null]);

  const handleDelete = (todo: DailyTodo) => {
    Alert.alert('Delete Todo', `Remove "${todo.text}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(todo) },
    ]);
  };

  const makeOnNext = useCallback(
    (pos: number) => () => {
      if (pos < 3) {
        itemRefs.current[pos]?.startEditing();
      }
    },
    [],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Top 3 Todos</Text>
      <View style={styles.card}>
        {[1, 2, 3].map((pos) => (
          <DailyTodoItem
            key={pos}
            ref={(el) => { itemRefs.current[pos - 1] = el; }}
            todo={todoByPosition.get(pos) ?? null}
            position={pos}
            onSave={onSave}
            onToggle={onToggle}
            onDelete={handleDelete}
            onNext={pos < 3 ? makeOnNext(pos) : undefined}
          />
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: import('@/lib/theme').ThemeColors) {
  return StyleSheet.create({
    container: {
      marginBottom: theme.spacing.xs,
    },
    sectionLabel: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.semibold as any,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.xs,
      ...theme.shadow.sm,
    },
  });
}
