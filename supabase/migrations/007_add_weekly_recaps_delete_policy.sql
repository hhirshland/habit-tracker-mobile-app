-- Allow users to delete their own recaps (used in dev for testing regeneration)
create policy "Users can delete their own recaps"
  on public.weekly_recaps for delete
  using (auth.uid() = user_id);
