-- Add category_id to identity_statements for icon mapping
alter table public.identity_statements
  add column category_id text;
