-- ============================================
-- Profile Settings Sync
-- ============================================

alter table public.profiles
  add column if not exists settings jsonb;

-- Keep payload constrained to JSON objects when provided.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_settings_is_object'
  ) then
    alter table public.profiles
      add constraint profiles_settings_is_object
      check (settings is null or jsonb_typeof(settings) = 'object');
  end if;
end
$$;
