import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EVENTS, captureEvent } from '@/lib/analytics';
import { queryKeys } from '@/lib/queryClient';
import type { DailyTodo } from '@/lib/types';
import {
  getDailyTodosForDate,
  getDailyTodosForDateRange,
  upsertDailyTodo,
  toggleDailyTodo,
  updateDailyTodoText,
  deleteDailyTodo,
} from '@/lib/dailyTodos';

const STALE = {
  todos: 1000 * 30,
} as const;

export function useDailyTodos(date: string) {
  return useQuery({
    queryKey: queryKeys.dailyTodos.forDate(date),
    queryFn: () => getDailyTodosForDate(date),
    staleTime: STALE.todos,
  });
}

export function useDailyTodosForRange(start: string, end: string) {
  return useQuery({
    queryKey: queryKeys.dailyTodos.forRange(start, end),
    queryFn: () => getDailyTodosForDateRange(start, end),
    staleTime: STALE.todos,
  });
}

export function useUpsertDailyTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      date,
      position,
      text,
    }: {
      userId: string;
      date: string;
      position: number;
      text: string;
    }) => upsertDailyTodo(userId, date, position, text),
    onMutate: async (variables) => {
      const key = queryKeys.dailyTodos.forDate(variables.date);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<DailyTodo[]>(key);

      const isNew = !previous?.find((t) => t.position === variables.position);

      qc.setQueryData<DailyTodo[]>(key, (old = []) => {
        const existing = old.find((t) => t.position === variables.position);
        if (existing) {
          return old.map((t) =>
            t.position === variables.position ? { ...t, text: variables.text } : t
          );
        }
        return [
          ...old,
          {
            id: `optimistic-${variables.position}`,
            user_id: variables.userId,
            todo_date: variables.date,
            text: variables.text,
            is_completed: false,
            position: variables.position,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      });

      return { previous, isNew };
    },
    onSuccess: (_, variables, context) => {
      if (context?.isNew) {
        captureEvent(EVENTS.TODO_CREATED, {
          position: variables.position,
          day_of_week: new Date(`${variables.date}T12:00:00`).getDay(),
        });
      }
    },
    onError: (_err, variables, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.dailyTodos.forDate(variables.date), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['dailyTodos'] });
    },
  });
}

export function useToggleDailyTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      todoId,
      isCompleted,
    }: {
      todoId: string;
      isCompleted: boolean;
      date: string;
      position?: number;
    }) => toggleDailyTodo(todoId, isCompleted),
    onMutate: async (variables) => {
      const key = queryKeys.dailyTodos.forDate(variables.date);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<DailyTodo[]>(key);

      qc.setQueryData<DailyTodo[]>(key, (old = []) =>
        old.map((t) =>
          t.id === variables.todoId ? { ...t, is_completed: !t.is_completed } : t
        )
      );

      return { previous };
    },
    onSuccess: (_, variables) => {
      if (variables.isCompleted) {
        captureEvent(EVENTS.TODO_UNCOMPLETED, {
          todo_id: variables.todoId,
          position: variables.position ?? 0,
        });
      } else {
        captureEvent(EVENTS.TODO_COMPLETED, {
          todo_id: variables.todoId,
          position: variables.position ?? 0,
        });
      }
    },
    onError: (_err, variables, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.dailyTodos.forDate(variables.date), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['dailyTodos'] });
    },
  });
}

export function useUpdateDailyTodoText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      todoId,
      text,
    }: {
      todoId: string;
      text: string;
      date: string;
    }) => updateDailyTodoText(todoId, text),
    onMutate: async (variables) => {
      const key = queryKeys.dailyTodos.forDate(variables.date);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<DailyTodo[]>(key);

      qc.setQueryData<DailyTodo[]>(key, (old = []) =>
        old.map((t) =>
          t.id === variables.todoId ? { ...t, text: variables.text } : t
        )
      );

      return { previous };
    },
    onError: (_err, variables, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.dailyTodos.forDate(variables.date), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['dailyTodos'] });
    },
  });
}

export function useDeleteDailyTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      todoId,
    }: {
      todoId: string;
      date: string;
    }) => deleteDailyTodo(todoId),
    onMutate: async (variables) => {
      const key = queryKeys.dailyTodos.forDate(variables.date);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<DailyTodo[]>(key);

      qc.setQueryData<DailyTodo[]>(key, (old = []) =>
        old.filter((t) => t.id !== variables.todoId)
      );

      return { previous };
    },
    onSuccess: (_, variables) => {
      captureEvent(EVENTS.TODO_DELETED, { todo_id: variables.todoId });
    },
    onError: (_err, variables, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.dailyTodos.forDate(variables.date), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['dailyTodos'] });
    },
  });
}
