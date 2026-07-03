## Grant admin role to omar@priklpay.com

STEP 1 (done, read-only):
- auth_user_id: `cd6a0ad9-1458-48cd-ac5c-17a26c5221d5`
- customer_id: `f1ac3f53-7077-400c-91cd-927be18f6d84`
- current roles: `{customer}`

STEP 2 — insert admin role (idempotent) via the insert tool:
```sql
insert into user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'omar@priklpay.com'
on conflict (user_id, role) do nothing;
```

STEP 3 — re-run STEP 1 query and paste result. Expected roles: `{customer, admin}`.

No code or schema changes.
