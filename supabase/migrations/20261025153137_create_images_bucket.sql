/*
# Create public images bucket for flashcard pictures

1. Storage
- Create a new public bucket named `images` to hold flashcard picture uploads.
- The bucket is public (anyone can read object URLs directly) so the <img> tags
  can load pictures without signed URLs.
2. Security (storage.objects RLS)
- Enable RLS on storage.objects (already enabled by default in Supabase).
- Grant SELECT/INSERT/UPDATE/DELETE to `anon, authenticated` because this is a
  single-tenant app with no sign-in screen — the anon-key client must be able to
  upload, list, and delete pictures on behalf of the therapist using the app.
- Add permissive CRUD policies scoped to the `images` bucket only. Because the
  app is intentionally single-tenant and the bucket is dedicated to flashcard
  images, all operations are allowed for anon + authenticated roles.
3. Notes
- The bucket id is referenced from the frontend as the constant `BUCKET = 'images'`.
- Policies are scoped with `bucket_id = 'images'` so they do not affect other buckets.
*/

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- SELECT: anyone can read objects in the images bucket
drop policy if exists "images_bucket_public_read" on storage.objects;
create policy "images_bucket_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'images');

-- INSERT: anon + authenticated can upload into the images bucket
drop policy if exists "images_bucket_public_insert" on storage.objects;
create policy "images_bucket_public_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'images');

-- UPDATE: anon + authenticated can overwrite objects in the images bucket
drop policy if exists "images_bucket_public_update" on storage.objects;
create policy "images_bucket_public_update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'images')
  with check (bucket_id = 'images');

-- DELETE: anon + authenticated can remove objects from the images bucket
drop policy if exists "images_bucket_public_delete" on storage.objects;
create policy "images_bucket_public_delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'images');
