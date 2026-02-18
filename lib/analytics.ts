import { posthogClient } from '@/lib/posthog';
import type { JsonType } from '@posthog/core';

export const EVENTS = {
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_HABIT_ADDED: 'onboarding_habit_added',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  HABIT_CREATED: 'habit_created',
  HABIT_UPDATED: 'habit_updated',
  HABIT_DELETED: 'habit_deleted',
  HABIT_COMPLETED: 'habit_completed',
  HABIT_UNCOMPLETED: 'habit_uncompleted',
  HABIT_SNOOZED: 'habit_snoozed',
  HABIT_UNSNOOZED: 'habit_unsnoozed',
  GOAL_CREATED: 'goal_created',
  GOAL_DELETED: 'goal_deleted',
  GOAL_ENTRY_ADDED: 'goal_entry_added',
  HEALTH_CONNECTED: 'health_connected',
  HEALTH_PERMISSIONS_REQUESTED: 'health_permissions_requested',
  TODO_CREATED: 'todo_created',
  TODO_COMPLETED: 'todo_completed',
  TODO_UNCOMPLETED: 'todo_uncompleted',
  TODO_DELETED: 'todo_deleted',
  TOP3_TODOS_TOGGLED: 'top3_todos_toggled',
  JOURNAL_SUBMITTED: 'journal_submitted',
  JOURNAL_TOGGLED: 'journal_toggled',
  SCREEN_VIEWED: 'screen_viewed',
  AVATAR_UPLOADED: 'avatar_uploaded',
  PROFILE_UPDATED: 'profile_updated',
} as const;

type EventName = (typeof EVENTS)[keyof typeof EVENTS];

type EventPropertiesMap = {
  user_signed_up: { method: 'email' };
  user_signed_in: { method: 'email' };
  user_signed_out: undefined;
  onboarding_started: undefined;
  onboarding_habit_added: {
    habit_name: string;
    has_health_metric: boolean;
    position: number;
  };
  onboarding_completed: { habits_count: number };
  habit_created: {
    habit_name: string;
    frequency_per_week: number;
    has_specific_days: boolean;
    auto_complete: boolean;
    metric_type: string | null;
  };
  habit_updated: {
    habit_id: string;
    fields_changed: string[];
  };
  habit_deleted: {
    habit_id: string;
    habit_name?: string;
  };
  habit_completed: {
    habit_id: string;
    habit_name?: string;
    is_auto_complete: boolean;
    day_of_week: number;
  };
  habit_uncompleted: {
    habit_id: string;
    habit_name?: string;
  };
  habit_snoozed: {
    habit_id: string;
    habit_name?: string;
  };
  habit_unsnoozed: {
    habit_id: string;
    habit_name?: string;
  };
  goal_created: {
    goal_type: string;
    target_value: number;
    unit: string;
    data_source: 'apple_health' | 'manual';
    has_target_date: boolean;
  };
  goal_deleted: {
    goal_id: string;
    goal_type?: string;
  };
  goal_entry_added: {
    goal_id: string;
    goal_type?: string;
    value: number;
  };
  todo_created: {
    position: number;
    day_of_week: number;
  };
  todo_completed: {
    todo_id: string;
    position: number;
  };
  todo_uncompleted: {
    todo_id: string;
    position: number;
  };
  todo_deleted: {
    todo_id: string;
  };
  top3_todos_toggled: {
    enabled: boolean;
  };
  journal_submitted: {
    is_edit: boolean;
    date: string;
  };
  journal_toggled: {
    enabled: boolean;
  };
  health_connected: undefined;
  health_permissions_requested: {
    metrics: string[];
  };
  screen_viewed: {
    screen_name: string;
  };
  avatar_uploaded: undefined;
  profile_updated: undefined;
};

export function captureEvent<T extends EventName>(
  event: T,
  properties?: EventPropertiesMap[T]
) {
  if (!posthogClient) return;
  posthogClient.capture(event, properties);
}

export function trackScreen(screenName: string) {
  if (!posthogClient) return;
  posthogClient.screen(screenName, { screen_name: screenName });
}

export function identifyUser(
  distinctId: string,
  properties?: Record<string, JsonType>
) {
  if (!posthogClient) return;
  posthogClient.identify(distinctId, properties);
}

export function setUserProperties(
  properties: Record<string, JsonType>
) {
  if (!posthogClient) return;
  posthogClient.setPersonProperties(properties);
}

export function setSuperProperties(
  properties: Record<string, JsonType>
) {
  if (!posthogClient) return;
  posthogClient.register(properties);
}

export function resetUser() {
  if (!posthogClient) return;
  posthogClient.reset();
}
