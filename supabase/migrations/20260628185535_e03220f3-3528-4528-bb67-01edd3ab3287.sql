drop policy if exists "uploads service role select" on storage.objects;
drop policy if exists "uploads service role insert" on storage.objects;
drop policy if exists "uploads service role update" on storage.objects;
drop policy if exists "uploads service role delete" on storage.objects;
drop policy if exists "uploads deny anon"          on storage.objects;
drop policy if exists "uploads deny authenticated" on storage.objects;

create policy "uploads service role select"
  on storage.objects for select to service_role
  using (bucket_id = 'uploads');

create policy "uploads service role insert"
  on storage.objects for insert to service_role
  with check (bucket_id = 'uploads');

create policy "uploads service role update"
  on storage.objects for update to service_role
  using (bucket_id = 'uploads')
  with check (bucket_id = 'uploads');

create policy "uploads service role delete"
  on storage.objects for delete to service_role
  using (bucket_id = 'uploads');

create policy "uploads deny anon"
  on storage.objects for all to anon
  using (bucket_id = 'uploads' and false)
  with check (false);

create policy "uploads deny authenticated"
  on storage.objects for all to authenticated
  using (bucket_id = 'uploads' and false)
  with check (false);