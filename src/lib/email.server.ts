// Server-only transactional email via Resend's REST API (no SDK — fetch is
// Worker-runtime-safe, same constraint family as the Stripe webhook).
// Import ONLY via `await import("@/lib/email.server")` inside a server fn/route.
// Both send helpers SELF-CATCH: they never throw. Email is a side effect and must
// never fail the webhook (Stripe would retry) or an admin save.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function getResendKey(): string {
  const k = process.env.RESEND_API_KEY;
  if (!k) throw new Error("RESEND_API_KEY is not configured");
  return k;
}

function fromAddress(): string {
  // Swap to a verified-domain sender at launch by setting EMAIL_FROM, e.g.
  // "Bright Transfers <orders@send.brighttransfers.com>". Until the domain
  // verifies, Resend's onboarding sender only delivers to your OWN Resend
  // account email — fine for testing.
  return process.env.EMAIL_FROM ?? "Bright Transfers <onboarding@resend.dev>";
}

function siteOrigin(): string {
  return (process.env.PUBLIC_SITE_URL as string | undefined) ?? "https://bright-film-prints.lovable.app";
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${getResendKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromAddress(), to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] send failed ${res.status}: ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send threw:", (err as Error).message);
    return false;
  }
}

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
const shortId = (id: string) => id.slice(0, 8).toUpperCase();

type RecipientOrder = {
  id: string; email: string; view_token: string; customer_id: string | null;
  subtotal: number; shipping_fee: number; rush_fee: number; tax: number; total: number;
  rewards_earned: number; status: string; tracking_number: string | null;
  carrier: string | null; shipping_address: any | null;
};

async function loadOrderForEmail(orderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, email, view_token, customer_id, subtotal, shipping_fee, rush_fee, tax, total, rewards_earned, status, tracking_number, carrier, shipping_address")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;
  let toEmail = order.email;
  let name: string | null = null;
  if (order.customer_id) {
    const { data: cust } = await supabaseAdmin.from("customers").select("email, name").eq("id", order.customer_id).maybeSingle();
    if (cust?.email) toEmail = cust.email;
    if (cust?.name) name = cust.name;
  }
  const { data: items } = await supabaseAdmin
    .from("order_items").select("size_ft, quantity, line_total")
    .eq("order_id", orderId).order("size_ft", { ascending: false });
  return { order: order as unknown as RecipientOrder, toEmail, name, items: items ?? [] };
}

const CELL = 'style="padding:6px 0;font:14px/1.5 Helvetica,Arial,sans-serif;color:#2A2320"';
const CELL_R = 'style="padding:6px 0;font:14px/1.5 Helvetica,Arial,sans-serif;color:#2A2320;text-align:right"';

function itemsRows(items: { size_ft: number; quantity: number; line_total: number }[]): string {
  return items.map((i) =>
    `<tr><td ${CELL}>${i.size_ft} ft sheet × ${i.quantity}</td><td ${CELL_R}>${money(i.line_total)}</td></tr>`
  ).join("");
}

function shell(inner: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FFF7EC">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7EC;padding:32px 16px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #EADFCF;border-radius:16px;padding:32px">
            <tr>
              <td style="font:700 16px/1.2 Helvetica,Arial,sans-serif;color:#2A2320;padding-bottom:20px">
                Bright Transfers
              </td>
            </tr>
            <tr>
              <td>
${inner}
              </td>
            </tr>
          </table>
          <div style="max-width:560px;font:12px/1.6 Helvetica,Arial,sans-serif;color:#8A7E70;padding:16px 8px 0">
            Bright Transfers · Brighter prints at a brighter price.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#F5A524;color:#2A2320;font:600 14px/1 Helvetica,Arial,sans-serif;text-decoration:none;padding:14px 22px;border-radius:999px">${label}</a>`;
}

export async function sendOrderConfirmationEmail(orderId: string): Promise<boolean> {
  try {
    const loaded = await loadOrderForEmail(orderId);
    if (!loaded) { console.error(`[email] confirmation: order ${orderId} not found`); return false; }
    const { order, toEmail, name, items } = loaded;
    const link = `${siteOrigin()}/orders/${order.view_token}`;
    const greeting = name ? `Hi ${name},` : "Hi,";
    const rewardsLine = order.rewards_earned > 0
      ? `<p style="font:14px/1.6 Helvetica,Arial,sans-serif;color:#2A2320;margin:16px 0 0">You earned <strong>${money(order.rewards_earned)}</strong> in rewards on this order.</p>`
      : "";
    const inner = `
      <h1 style="font:700 24px/1.25 Helvetica,Arial,sans-serif;color:#2A2320;margin:0 0 12px">Order confirmed</h1>
      <p style="font:14px/1.6 Helvetica,Arial,sans-serif;color:#2A2320;margin:0 0 8px">${greeting}</p>
      <p style="font:14px/1.6 Helvetica,Arial,sans-serif;color:#2A2320;margin:0 0 20px">Thanks for your order. We're on it — you'll get another email when it ships.</p>
      <p style="font:600 13px/1.4 Helvetica,Arial,sans-serif;color:#8A7E70;margin:0 0 8px">Order #${shortId(order.id)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #EADFCF;border-bottom:1px solid #EADFCF;margin:0 0 12px">
        ${itemsRows(items)}
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td ${CELL}>Subtotal</td><td ${CELL_R}>${money(order.subtotal)}</td></tr>
        <tr><td ${CELL}>Shipping</td><td ${CELL_R}>${money(order.shipping_fee)}</td></tr>
        ${order.rush_fee > 0 ? `<tr><td ${CELL}>Rush</td><td ${CELL_R}>${money(order.rush_fee)}</td></tr>` : ""}
        <tr><td ${CELL}>Tax</td><td ${CELL_R}>${money(order.tax)}</td></tr>
        <tr><td style="padding:10px 0 0;border-top:1px solid #EADFCF;font:700 15px/1.5 Helvetica,Arial,sans-serif;color:#2A2320">Total</td><td style="padding:10px 0 0;border-top:1px solid #EADFCF;font:700 15px/1.5 Helvetica,Arial,sans-serif;color:#2A2320;text-align:right">${money(order.total)}</td></tr>
      </table>
      ${rewardsLine}
      <p style="margin:24px 0 0">${ctaButton(link, "View your order")}</p>`;
    return await sendEmail(toEmail, `Order confirmed · #${shortId(order.id)}`, shell(inner));
  } catch (err) { console.error("[email] confirmation threw:", (err as Error).message); return false; }
}

export async function sendShippingNotificationEmail(orderId: string): Promise<boolean> {
  try {
    const loaded = await loadOrderForEmail(orderId);
    if (!loaded) { console.error(`[email] shipping: order ${orderId} not found`); return false; }
    const { order, toEmail, name } = loaded;
    const link = `${siteOrigin()}/orders/${order.view_token}`;
    const greeting = name ? `Hi ${name},` : "Hi,";
    const trackingLine = order.tracking_number
      ? `<p style="font:14px/1.6 Helvetica,Arial,sans-serif;color:#2A2320;margin:0 0 20px">Carrier: <strong>${order.carrier ?? "—"}</strong><br />Tracking: <strong>${order.tracking_number}</strong></p>`
      : "";
    const inner = `
      <h1 style="font:700 24px/1.25 Helvetica,Arial,sans-serif;color:#2A2320;margin:0 0 12px">Your order shipped</h1>
      <p style="font:14px/1.6 Helvetica,Arial,sans-serif;color:#2A2320;margin:0 0 8px">${greeting}</p>
      <p style="font:14px/1.6 Helvetica,Arial,sans-serif;color:#2A2320;margin:0 0 20px">Good news — order #${shortId(order.id)} is on its way.</p>
      ${trackingLine}
      <p style="margin:8px 0 0">${ctaButton(link, "Track your order")}</p>`;
    return await sendEmail(toEmail, `Your order shipped · #${shortId(order.id)}`, shell(inner));
  } catch (err) { console.error("[email] shipping threw:", (err as Error).message); return false; }
}
