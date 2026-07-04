import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { getAdminOrderDetail, updateAdminOrder, type AdminOrderDetail } from "@/lib/admin.orders.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin_/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order — Admin" },
      { name: "description", content: "Admin order detail." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminOrderDetailPage,
});

const NEUTRAL_STATUSES = new Set(["paid", "in_production", "printed", "shipped", "delivered", "on_hold"]);

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
  } catch { return iso; }
}
function formatMoney(n: number) { return `$${(Number(n) || 0).toFixed(2)}`; }

function StatusPill({ status }: { status: string }) {
  const isIssue = status === "issue";
  const isNeutral = NEUTRAL_STATUSES.has(status);
  const cls = isIssue ? "border-ember text-ember" : isNeutral ? "border-line text-ink" : "border-line text-stone";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function AdminOrderDetailPage() {
  const { id } = Route.useParams();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setReady(true);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-10">
        {!ready ? (
          <div className="rounded-2xl border border-line bg-white p-6 text-ink/60">Loading order…</div>
        ) : !session ? (
          <div className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-sm">
            <p className="text-ink">Admin access requires sign-in.</p>
            <Link to="/account" className="mt-3 inline-block text-ink underline underline-offset-2">Go to sign in</Link>
          </div>
        ) : (
          <DetailLoader id={id} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function DetailLoader({ id }: { id: string }) {
  const getDetailFn = useServerFn(getAdminOrderDetail);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "denied" }
    | { kind: "notfound" }
    | { kind: "ok"; order: AdminOrderDetail }
  >({ kind: "loading" });

  const load = useCallback(
    (showLoading: boolean) => {
      let cancelled = false;
      if (showLoading) setState({ kind: "loading" });
      getDetailFn({ data: { orderId: id } })
        .then((order) => {
          if (cancelled) return;
          if (!order) setState({ kind: "notfound" });
          else setState({ kind: "ok", order });
        })
        .catch(() => { if (!cancelled) setState({ kind: "denied" }); });
      return () => { cancelled = true; };
    },
    [getDetailFn, id],
  );

  useEffect(() => load(true), [load]);
  const reload = useCallback(() => { load(false); }, [load]);

  if (state.kind === "loading") {
    return <div className="rounded-2xl border border-line bg-white p-6 text-ink/60">Loading order…</div>;
  }
  if (state.kind === "denied") {
    return (
      <div className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-sm">
        <p className="text-ink">Not authorized.</p>
        <Link to="/admin" className="mt-3 inline-block text-ink underline underline-offset-2">Back to admin</Link>
      </div>
    );
  }
  if (state.kind === "notfound") {
    return (
      <div className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-sm">
        <p className="text-ink">Order not found.</p>
        <Link to="/admin" className="mt-3 inline-block text-ink underline underline-offset-2">Back to admin</Link>
      </div>
    );
  }
  return <OrderView order={state.order} reload={reload} />;
}

function OrderView({ order, reload }: { order: AdminOrderDetail; reload: () => void }) {
  const isIssue = order.status === "issue";
  const ship = order.shipping_address as
    | { name?: string; address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string } | null }
    | null;
  const addr = ship?.address ?? null;

  return (
    <div className="space-y-6">
      <Link to="/admin" className="text-sm text-stone hover:text-ink">← All orders</Link>

      <div className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-xl text-ink">{order.id}</h1>
          <StatusPill status={order.status} />
        </div>
        <p className="mt-2 text-sm text-stone">
          {formatDate(order.created_at)} · {order.customer_name || order.customer_email}
          {order.is_guest ? <span className="ml-2 text-xs text-stone">guest</span> : null}
        </p>
        {order.notes ? (
          <p className={`mt-3 whitespace-pre-wrap text-sm ${isIssue ? "text-ember" : "text-stone"}`}>{order.notes}</p>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-ink">Totals</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatMoney(order.subtotal)} />
            <Row label="Shipping" value={formatMoney(order.shipping_fee)} />
            {order.is_rush ? <Row label="Rush" value={formatMoney(order.rush_fee)} /> : null}
            <Row label="Tax" value={formatMoney(order.tax)} />
            <Row label="Total" value={formatMoney(order.total)} bold />
            {order.rewards_earned > 0 ? (
              <Row label="Rewards earned" value={formatMoney(order.rewards_earned)} />
            ) : null}
            {order.rewards_redeemed > 0 ? (
              <Row label="Rewards redeemed" value={`−${formatMoney(order.rewards_redeemed)}`} />
            ) : null}
          </dl>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-ink">Ship to</h2>
          {ship && (ship.name || addr) ? (
            <address className="mt-3 not-italic text-sm text-ink leading-6">
              {ship.name ? <div>{ship.name}</div> : null}
              {addr?.line1 ? <div>{addr.line1}</div> : null}
              {addr?.line2 ? <div>{addr.line2}</div> : null}
              <div>
                {[addr?.city, addr?.state, addr?.postal_code].filter(Boolean).join(", ")}
              </div>
              {addr?.country ? <div>{addr.country}</div> : null}
            </address>
          ) : (
            <p className="mt-3 text-sm text-ember">No ship-to address on file</p>
          )}
        </div>
      </div>

      <FulfillmentEditor order={order} reload={reload} />

      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold text-ink">Items</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-stone">
                <th className="py-2 pr-3 font-medium">Source</th>
                <th className="py-2 pr-3 font-medium">Size (ft)</th>
                <th className="py-2 pr-3 font-medium">Qty</th>
                <th className="py-2 pr-3 font-medium">Unit</th>
                <th className="py-2 pr-3 font-medium">Line total</th>
                <th className="py-2 pr-3 font-medium">DPI</th>
                <th className="py-2 pr-3 font-medium">Print file</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it) => (
                <tr key={it.id} className="border-b border-line/60 align-top">
                  <td className="py-3 pr-3 text-ink">{it.source}</td>
                  <td className="py-3 pr-3 text-ink">{it.size_ft}</td>
                  <td className="py-3 pr-3 text-ink">{it.quantity}</td>
                  <td className="py-3 pr-3 text-ink whitespace-nowrap">{formatMoney(it.unit_price)}</td>
                  <td className="py-3 pr-3 text-ink whitespace-nowrap">{formatMoney(it.line_total)}</td>
                  <td className="py-3 pr-3">
                    {it.dpi_ok === true ? (
                      <span className="text-ink">ok</span>
                    ) : it.dpi_ok === false ? (
                      <span className="text-ember">low</span>
                    ) : (
                      <span className="text-stone">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    {it.file?.download_url ? (
                      <div className="flex flex-col gap-0.5">
                        <a
                          href={it.file.download_url}
                          target="_blank"
                          rel="noopener"
                          className="text-ink underline underline-offset-2 hover:text-sun"
                        >
                          Download
                        </a>
                        {it.file.width_px && it.file.height_px ? (
                          <span className="text-xs text-stone">{it.file.width_px}×{it.file.height_px}px</span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-stone">no file</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-stone">{label}</dt>
      <dd className={bold ? "font-semibold text-ink" : "text-ink"}>{value}</dd>
    </div>
  );
}
