-- ============================================
-- Habit Tracker Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
create table public.profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  full_name text,
  avatar_url text,
  has_onboarded boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

-- ============================================
-- HABITS TABLE
-- ============================================
create table public.habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  frequency_per_week integer not null default 7 check (frequency_per_week between 1 and 7),
  specific_days jsonb, -- array of day numbers: [0,1,2,3,4,5,6] where 0=Sun. null = any days
  is_active boolean default true not null,
  metric_type text, -- e.g. 'steps', 'weight', 'resting_heart_rate', 'workout_minutes'
  metric_threshold numeric, -- e.g. 10000 for 10k steps
  auto_complete boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.habits enable row level security;

-- Habits policies
create policy "Users can view their own habits"
  on public.habits for select
  using (auth.uid() = user_id);

create policy "Users can insert their own habits"
  on public.habits for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own habits"
  on public.habits for update
  using (auth.uid() = user_id);

create policy "Users can delete their own habits"
  on public.habits for delete
  using (auth.uid() = user_id);

create trigger habits_updated_at
  before update on public.habits
  for each row execute procedure public.update_updated_at();

-- ============================================
-- HEALTH METRIC LINKING (for auto-completion)
-- ============================================
-- Migration: Add metric linking columns to habits
-- Run this ALTER if the table already exists:
--   alter table public.habits add column metric_type text;
--   alter table public.habits add column metric_threshold numeric;
--   alter table public.habits add column auto_complete boolean default false not null;
-- Or include in the CREATE TABLE above for fresh installs.

-- ============================================
-- HABIT COMPLETIONS TABLE
-- ============================================
create table public.habit_completions (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  completed_date date not null,
  created_at timestamptz default now() not null,
  -- Prevent duplicate completions for same habit on same day
  unique(habit_id, completed_date)
);

-- Enable RLS
alter table public.habit_completions enable row level security;

-- Completions policies
create policy "Users can view their own completions"
  on public.habit_completions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own completions"
  on public.habit_completions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own completions"
  on public.habit_completions for delete
  using (auth.uid() = user_id);

-- Index for fast lookups
create index idx_habit_completions_date on public.habit_completions(user_id, completed_date);
create index idx_habit_completions_habit on public.habit_completions(habit_id, completed_date);
create index idx_habits_user on public.habits(user_id, is_active);

-- ============================================
-- HABIT SNOOZES TABLE
-- ============================================
create table public.habit_snoozes (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  snoozed_date date not null,
  created_at timestamptz default now() not null,
  -- Prevent duplicate snoozes for same habit on same day
  unique(habit_id, snoozed_date)
);

-- Enable RLS
alter table public.habit_snoozes enable row level security;

-- Snoozes policies
create policy "Users can view their own snoozes"
  on public.habit_snoozes for select
  using (auth.uid() = user_id);

create policy "Users can insert their own snoozes"
  on public.habit_snoozes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own snoozes"
  on public.habit_snoozes for delete
  using (auth.uid() = user_id);

create index idx_habit_snoozes_date on public.habit_snoozes(user_id, snoozed_date);
create index idx_habit_snoozes_habit on public.habit_snoozes(habit_id, snoozed_date);
