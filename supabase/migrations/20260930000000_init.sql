-- My World: one archive per account, and a private bucket of photo files.
--
-- The archive is one JSON document (the same graph the app keeps in the browser without a
-- backend), so an edit is one small write. Every table and every file is closed to everyone
-- but its owner: the public (anon) key in the page can do nothing on its own.

create table public.archives (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.archives enable row level security;

create policy "archives: read own" on public.archives
  for select using (auth.uid() = user_id);
create policy "archives: add own" on public.archives
  for insert with check (auth.uid() = user_id);
create policy "archives: change own" on public.archives
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "archives: delete own" on public.archives
  for delete using (auth.uid() = user_id);

-- Photos: private, under <account id>/<photo id>. The app resizes them to 1600 px JPEG before
-- upload, so 10 MB is far more than it ever sends.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "photos: read own" on storage.objects
  for select using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: add own" on storage.objects
  for insert with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: change own" on storage.objects
  for update using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: delete own" on storage.objects
  for delete using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
