# Grant admin to test@brighttransfers.com

## Confirmed current state

Both accounts exist. Roles read before any change:

| Email | User id | Roles today |
| --- | --- | --- |
| omar@priklpay.com | cd6a0ad9-1458-48cd-ac5c-17a26c5221d5 | customer, admin |
| test@brighttransfers.com | bd781c29-3f8e-499c-8149-197a74d57b82 | customer |

The review account has no admin row yet, so the grant is needed.

## What I'll do

1. Insert one row into the roles table for user id `bd781c29-3f8e-499c-8149-197a74d57b82` with role `admin` — identical shape to how the existing admin is granted (id and created_at come from defaults).
2. Make it idempotent: the insert is written so that if an admin row already exists for that user, nothing happens (the table has a unique user/role pair).
3. Re-read the roles for that user and report the resulting rows.

Nothing else changes: no other user's roles, no access rules, no admin gate code, no other table, no app files.

## Technical note

Single statement, run as a data change (not a schema migration):

```sql
insert into public.user_roles (user_id, role)
values ('bd781c29-3f8e-499c-8149-197a74d57b82', 'admin')
on conflict (user_id, role) do nothing;
```

Then a verification read of `user_roles` filtered to that user id.

## One flag before you approve

This account gets full admin power: it can read every order, every customer email and address, and change order status/tracking. Since it's a shared throwaway for client review, recommend revoking the role right after the review (one row delete) and not reusing the credentials afterwards.
