-- ============================================
-- Migration: Add health metric linking to habits
-- ============================================
-- Adds columns to support linking habits to Apple Health metrics
-- and auto-completing habits when thresholds are met.

alter table public.habits add column if not exists metric_type text;
alter table public.habits add column if not exists metric_threshold numeric;
alter table public.habits add column if not exists auto_complete boolean default false not null;

-- Add a comment for clarity
comment on column public.habits.metric_type is 'Health metric type: steps, weight, resting_heart_rate, workout_minutes';
comment on column public.habits.metric_threshold is 'Threshold value to auto-complete the habit (e.g. 10000 for 10k steps)';
comment on column public.habits.auto_complete is 'Whether to auto-complete the habit when the metric threshold is met';
