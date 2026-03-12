-- ============================================
-- Identity Statements Feature
-- ============================================

-- ============================================
-- IDENTITY STATEMENTS TABLE
-- ============================================
create table public.identity_statements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  statement text not null,
  emoji text not null,
  sort_order integer not null default 0,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.identity_statements enable row level security;

-- Identity statements policies
create policy "Users can view their own identity statements"
  on public.identity_statements for select
  using (auth.uid() = user_id);

create policy "Users can insert their own identity statements"
  on public.identity_statements for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own identity statements"
  on public.identity_statements for update
  using (auth.uid() = user_id);

create policy "Users can delete their own identity statements"
  on public.identity_statements for delete
  using (auth.uid() = user_id);

create trigger identity_statements_updated_at
  before update on public.identity_statements
  for each row execute procedure public.update_updated_at();

create index idx_identity_statements_user on public.identity_statements(user_id, is_active);

-- ============================================
-- Add identity link to habits (nullable, backward-compatible)
-- ============================================
alter table public.habits
  add column identity_statement_id uuid references public.identity_statements(id) on delete set null;

create index idx_habits_identity on public.habits(identity_statement_id);
