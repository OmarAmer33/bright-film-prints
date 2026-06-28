# Storage RLS lockdown for `uploads` bucket

Close the **MISSING_STORAGE_RLS** critical finding so publish unblocks. Matches the 13.3 architecture: clients never touch Storage directly — uploads stream through `src/routes/api/uploads.upload.ts` (service-role admin client) and downloads use server-minted signed URLs.

## Migration (for approval)

```sql
-- storage.objects already has RLS enabled by Supabase; this is a no-op if so,
-- and required if it ever got disabled.
alter table storage.objects enable row level security;

-- Drop any prior policies we may have created for this bucket so this
-- migration is idempotent.
drop policy if exists "uploads service role select" on storage.objects;
drop policy if exists "uploads service role insert" on storage.objects;
drop policy if exists "uploads service role update" on storage.objects;
drop policy if exists "uploads service role delete" on storage.objects;
drop policy if exists "uploads deny anon"          on storage.objects;
drop policy if exists "uploads deny authenticated" on storage.objects;

-- Explicit service_role allow policies for the 'uploads' bucket.
-- (service_role bypasses RLS, but explicit policies satisfy the scanner
-- and document intent.)
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

-- Explicit deny for anon and authenticated on this bucket.
-- No USING clause that returns true => no rows match => no direct access.
create policy "uploads deny anon"
  on storage.objects for all to anon
  using (bucket_id = 'uploads' and false)
  with check (false);

create policy "uploads deny authenticated"
  on storage.objects for all to authenticated
  using (bucket_id = 'uploads' and false)
  with check (false);
```

## Why this is safe for existing code

- `src/routes/api/uploads.upload.ts` uses `supabaseAdmin` (service role) → matches the service_role policies → uploads keep working.
- Signed URLs are minted server-side with the admin client; signed-URL downloads use Storage's signature-verification path which doesn't depend on caller RLS → previews keep working.
- No code path uses the browser `supabase` client or an authenticated JWT to read/write `uploads` objects, so the deny policies for anon/authenticated change nothing today and prevent regressions tomorrow.

## After approval

1. Run the migration.
2. Mark **MISSING_STORAGE_RLS** as fixed with the policy summary, and update `@security-memory` to record: "uploads bucket is service-role-only by design — all access flows through server functions / signed URLs."
3. Publish — this also reloads `STRIPE_WEBHOOK_SECRET` in the Worker.
4. You hit **Resend** on the failed `checkout.session.completed` and run a fresh 4242 checkout; I'll verify the paid-flip in the DB.
