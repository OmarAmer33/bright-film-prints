## Storage cleanup plan — uploads bucket + last DB row

### Step 1 — Read-only report

**`uploads` bucket contents (8 objects, via `storage.objects`):**

| name | size (B) | created_at |
|---|---:|---|
| 94a3a7c6-8df8-40f1-8969-13dcbda38e34.png | 114 | 2026-06-28 17:29:26 |
| fc25b52e-ba69-4b5e-b5be-2fb07fcfa5dd.png | 18042 | 2026-06-28 18:38:00 |
| f637384a-8b61-4912-a6a8-b1b6f076beb0.png | 18042 | 2026-06-28 22:40:06 |
| 6a67b7be-37e2-47b1-b95c-c0a44af379a2.png | 18042 | 2026-06-28 22:44:31 |
| 183aa2c2-6688-4b7e-9673-fc95627f18b8.png | 18042 | 2026-06-28 23:17:16 |
| 60ac0479-02b7-41a2-b533-1db51a498b60.png | 18042 | 2026-06-28 23:21:10 |
| cfbe5e99-ae4e-4459-84bc-f125015051c5.png | 18042 | 2026-06-29 02:38:22 |
| f17e5d20-9854-451e-bef5-521cdfe0a513.png | 18042 | 2026-06-29 02:42:11 |

**`public.uploads` rows (1):**

| id | file_url | status | created_at |
|---|---|---|---|
| c49d12f4-e23a-4ffd-8a5d-37e9cc08a660 | 94a3a7c6-8df8-40f1-8969-13dcbda38e34.png | pending | 2026-06-28 17:29:27 |

**Cross-reference:** the orphan DB row's `file_url` (`94a3a7c6-….png`) matches the first bucket object. The other 7 objects are physical files whose DB rows were deleted in the previous cleanup migration (the 7 uploads referenced by test `order_items.notes`). No unexpected/foreign objects — every file is a test artifact from the pre-launch sandbox.

### Step 2 — Removal plan (awaiting approval; nothing runs yet)

Two actions, in order:

1. **Delete all 8 objects from the `uploads` bucket via the Storage API.** Use `supabaseAdmin.storage.from('uploads').remove([...8 names...])` so the physical files are removed (a raw `DELETE FROM storage.objects` would leave orphaned blobs behind). I'll run this from a one-shot Node script using the service role key — no project files created.
2. **Clear the last DB row:**
   ```sql
   DELETE FROM public.uploads;  -- expected: 1 row (c49d12f4-…)
   ```
   Guard: I'll re-check `SELECT count(*) FROM public.uploads` equals 1 immediately before running, and abort if not.

**Scope guarantees:** only the `uploads` bucket and the `public.uploads` table are touched. No other bucket, no other table, no schema changes.

### After running

Re-report:
- `uploads` bucket object count (expect **0**)
- `SELECT count(*) FROM public.uploads` (expect **0**)

Stopping here for your approval.
