import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@/lib/theme';
import { DailyTodo } from '@/lib/types';

interface DailyTodoItemProps {
  todo: DailyTodo | null;
  position: number;
  onSave: (position: number, text: string) => void;
  onToggle: (todo: DailyTodo) => void;
  onDelete: (todo: DailyTodo) => void;
}

export default function DailyTodoItem({
  todo,
  position,
  onSave,
  onToggle,
  onDelete,
}: DailyTodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(todo?.text ?? '');

  useEffect(() => {
    setText(todo?.text ?? '');
  }, [todo?.id, todo?.text]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onSave(position, trimmed);
    } else if (todo) {
      onDelete(todo);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setText(todo?.text ?? '');
    setEditing(false);
  };

  if (!todo && !editing) {
    return (
      <TouchableOpacity
        style={styles.emptyRow}
        onPress={() => { setText(''); setEditing(true); }}
        activeOpacity={0.7}
      >
        <View style={styles.emptyCheckbox}>
          <Text style={styles.positionNumber}>{position}</Text>
        </View>
        <Text style={styles.placeholder}>Add a todo...</Text>
      </TouchableOpacity>
    );
  }

  if (editing) {
    return (
      <View style={styles.editRow}>
        <View style={styles.emptyCheckbox}>
          <Text style={styles.positionNumber}>{position}</Text>
        </View>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="What's your priority?"
          placeholderTextColor={theme.colors.textMuted}
          autoFocus
          onSubmitEditing={handleSubmit}
          onBlur={handleCancel}
          returnKeyType="done"
          maxLength={100}
        />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.checkbox, todo!.is_completed && styles.checkboxCompleted]}
        onPress={() => onToggle(todo!)}
        activeOpacity={0.7}
      >
        {todo!.is_completed && (
          <FontAwesome name="check" size={10} color="#fff" />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.textContainer}
        onPress={() => {
          if (!todo!.is_completed) {
            setText(todo!.text);
            setEditing(true);
          }
        }}
        onLongPress={() => onDelete(todo!)}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.todoText, todo!.is_completed && styles.todoTextCompleted]}
          numberOfLines={1}
        >
          {todo!.text}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: theme.borderRadius.full,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  emptyCheckbox: {
    width: 22,
    height: 22,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionNumber: {
    fontSize: 11,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.textMuted,
  },
  textContainer: {
    flex: 1,
  },
  todoText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.textPrimary,
  },
  todoTextCompleted: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  placeholder: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  input: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary,
  },
});
