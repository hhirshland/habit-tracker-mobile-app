-- ============================================
-- Weekly Recaps Feature
-- ============================================

create table public.weekly_recaps (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start date not null,
  week_end date not null,
  content jsonb not null,
  is_read boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, week_start)
);

-- Enable RLS
alter table public.weekly_recaps enable row level security;

create policy "Users can view their own recaps"
  on public.weekly_recaps for select
  using (auth.uid() = user_id);

create policy "Users can insert their own recaps"
  on public.weekly_recaps for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own recaps"
  on public.weekly_recaps for update
  using (auth.uid() = user_id);

create trigger weekly_recaps_updated_at
  before update on public.weekly_recaps
  for each row execute procedure public.update_updated_at();

create index idx_weekly_recaps_user on public.weekly_recaps(user_id, week_start desc);
