-- ============================================
-- Goals Feature
-- ============================================

-- ============================================
-- GOALS TABLE
-- ============================================
create table public.goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  goal_type text not null, -- 'weight', 'running_pr', 'steps', 'resting_hr', 'weekly_workouts', 'body_fat', 'bmi', 'lean_body_mass', 'custom'
  title text not null,
  target_value numeric not null,
  unit text not null, -- 'lbs', 'mm:ss', 'steps', 'bpm', '%', 'kg/m²', 'workouts', etc.
  start_value numeric, -- value when goal was created
  start_date timestamptz default now() not null,
  target_date timestamptz, -- optional deadline
  rate numeric, -- e.g. 1 (lb/week for weight loss)
  rate_unit text, -- e.g. 'lbs/week'
  data_source text not null default 'manual', -- 'apple_health' or 'manual'
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.goals enable row level security;

-- Goals policies
create policy "Users can view their own goals"
  on public.goals for select
  using (auth.uid() = user_id);

create policy "Users can insert their own goals"
  on public.goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own goals"
  on public.goals for update
  using (auth.uid() = user_id);

create policy "Users can delete their own goals"
  on public.goals for delete
  using (auth.uid() = user_id);

create trigger goals_updated_at
  before update on public.goals
  for each row execute procedure public.update_updated_at();

create index idx_goals_user on public.goals(user_id, is_active);

-- ============================================
-- GOAL ENTRIES TABLE (manual data points)
-- ============================================
create table public.goal_entries (
  id uuid default uuid_generate_v4() primary key,
  goal_id uuid references public.goals(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  value numeric not null,
  recorded_date date not null,
  created_at timestamptz default now() not null,
  -- Allow multiple entries per day (e.g. multiple PR attempts)
  -- but index for fast lookups
  unique(goal_id, recorded_date)
);

-- Enable RLS
alter table public.goal_entries enable row level security;

-- Goal entries policies
create policy "Users can view their own goal entries"
  on public.goal_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own goal entries"
  on public.goal_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own goal entries"
  on public.goal_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete their own goal entries"
  on public.goal_entries for delete
  using (auth.uid() = user_id);

create index idx_goal_entries_goal on public.goal_entries(goal_id, recorded_date);
create index idx_goal_entries_user on public.goal_entries(user_id);
