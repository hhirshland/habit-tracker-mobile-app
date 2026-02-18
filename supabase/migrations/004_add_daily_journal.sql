-- ============================================
-- Daily Journal Feature
-- ============================================

create table public.daily_journal_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  journal_date date not null,
  win text not null default '',
  tension text not null default '',
  gratitude text not null default '',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, journal_date)
);

-- Enable RLS
alter table public.daily_journal_entries enable row level security;

create policy "Users can view their own journal entries"
  on public.daily_journal_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own journal entries"
  on public.daily_journal_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own journal entries"
  on public.daily_journal_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete their own journal entries"
  on public.daily_journal_entries for delete
  using (auth.uid() = user_id);

create trigger daily_journal_entries_updated_at
  before update on public.daily_journal_entries
  for each row execute procedure public.update_updated_at();

create index idx_daily_journal_user_date on public.daily_journal_entries(user_id, journal_date);
