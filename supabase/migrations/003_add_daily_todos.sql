-- ============================================
-- Top 3 Daily Todos Feature
-- ============================================

create table public.daily_todos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  todo_date date not null,
  text text not null,
  is_completed boolean default false not null,
  position integer not null check (position between 1 and 3),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, todo_date, position)
);

-- Enable RLS
alter table public.daily_todos enable row level security;

create policy "Users can view their own daily todos"
  on public.daily_todos for select
  using (auth.uid() = user_id);

create policy "Users can insert their own daily todos"
  on public.daily_todos for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own daily todos"
  on public.daily_todos for update
  using (auth.uid() = user_id);

create policy "Users can delete their own daily todos"
  on public.daily_todos for delete
  using (auth.uid() = user_id);

create trigger daily_todos_updated_at
  before update on public.daily_todos
  for each row execute procedure public.update_updated_at();

create index idx_daily_todos_user_date on public.daily_todos(user_id, todo_date);
