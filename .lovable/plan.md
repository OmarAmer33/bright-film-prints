# Add reply-to support to transactional email

One file: `src/lib/email.server.ts`. Customer replies to order confirmation and shipping emails currently land nowhere (`send.brighttransfers.com` has no MX record and no `reply_to` is sent). This adds an optional `reply_to` field to the Resend API call, driven by a new `EMAIL_REPLY_TO` secret.

## Exact edits

**1. New helper, directly below `fromAddress()` (lines 15–21), matching its style and comment pattern:**

```ts
function replyToAddress(): string | null {
  // Customers replying to order emails need a working mailbox; the sending
  // domain (send.brighttransfers.com) has no MX record. Set EMAIL_REPLY_TO,
  // e.g. "Bright Transfers <support@brighttransfers.com>", to route replies.
  return process.env.EMAIL_REPLY_TO ?? null;
}
```

**2. `sendEmail()` — build the POST body conditionally.** Current line 32:

```ts
body: JSON.stringify({ from: fromAddress(), to, subject, html }),
```

becomes:

```ts
const replyTo = replyToAddress();
const payload: Record<string, unknown> = { from: fromAddress(), to, subject, html };
if (replyTo) payload.reply_to = replyTo;
```

with `body: JSON.stringify(payload)`.

Nothing else in `sendEmail()` changes: same endpoint, same headers, same `res.ok` handling, same `[email] send failed` log, same self-catching try/catch and never-throw contract.

## Resulting request body

**`EMAIL_REPLY_TO` NOT set (default today):**

```json
{ "from": "…", "to": "…", "subject": "…", "html": "…" }
```

Byte-identical to the current body — `reply_to` is omitted entirely, never sent as `null`/`undefined`/`""`. The helper returns `null` and the `if` skips the key, so behavior with no secret is exactly today's.

**`EMAIL_REPLY_TO` set (e.g. to `orders@brighttransfers.com`):**

```json
{ "from": "…", "to": "…", "subject": "…", "html": "…", "reply_to": "…" }
```

## Explicitly untouched

- `fromAddress()`, `EMAIL_FROM`, the `onboarding@resend.dev` fallback
- `getResendKey()`, `siteOrigin()`, `RESEND_ENDPOINT`
- Both email templates: subjects, HTML bodies, links, item tables
- No other file — no routes, server fns, migrations, dependencies, or styles

## After building

The mechanism is inert until you set the `EMAIL_REPLY_TO` secret (via the secure form, e.g. `Bright Transfers <orders@brighttransfers.com>` — pick the mailbox you want replies to land in). No redeploy for the code other than the normal preview refresh; published sends pick the secret up at your next publish, same as the previous secret change.
