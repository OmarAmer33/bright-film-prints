import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { getOrderForView, type OrderForView } from "@/lib/orders.functions";
import { useCart } from "@/lib/cart-store";

type Search = { checkout?: "success" | "cancel" };

export const Route = createFileRoute("/orders/$token")({
  validateSearch: (raw: Record<string, unknown>): Search => ({
    checkout:
      raw.checkout === "success" || raw.checkout === "cancel"
        ? (raw.checkout as Search["checkout"])
        : undefined,
  }),
  loader: ({ params }) => getOrderForView({ data: { token: params.token } }),
  head: () => ({
    meta: [
      { title: "Your order — Bright Transfers" },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-3xl">We couldn't load your order</h1>
        <p className="mt-3 text-stone">Try the link again, or contact us if it persists.</p>
      </main>
      <SiteFooter />
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-3xl">Order not found</h1>
      </main>
      <SiteFooter />
    </div>
  ),
  component: OrderPage,
});

function OrderPage() {
  const initial = Route.useLoaderData() as OrderForView | null;
  const { checkout } = useSearch({ from: Route.id });
  const params = Route.useParams();

  const [order, setOrder] = useState<OrderForView | null>(initial);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const clearedRef = useRef(false);

  // Gate cart clear on verified ownership: the loader returning an order whose
  // view_token matches the URL param proves the URL is real and the token
  // resolved server-side. Never clear from URL flag alone.
  useEffect(() => {
    if (clearedRef.current) return;
    if (checkout !== "success") return;
    if (!order) return;
    if (order.view_token !== params.token) return;
    clearedRef.current = true;
    useCart.getState().clear();
  }, [checkout, order, params.token]);

  // Poll for paid flip while status is 'new', for up to 30s.
  useEffect(() => {
    if (!order || order.status !== "new") return;
    const started = Date.now();
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const next = await getOrderForView({ data: { token: params.token } });
        if (cancelled) return;
        if (next) setOrder(next);
        if (next && next.status !== "new") return; // done
      } catch (err) {
        console.error("[orders.poll]", err);
      }
      if (Date.now() - started >= 30_000) {
        setPollTimedOut(true);
        return;
      }
      setTimeout(tick, 2000);
    };
    const t = setTimeout(tick, 2000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [order, params.token]);

  if (!order) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-3xl">Order not found</h1>
          <p className="mt-3 text-stone">Check the link or contact us.</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
        <StatusBanner status={order.status} timedOut={pollTimedOut} checkout={checkout} />

        <h1 className="mt-6 text-3xl text-ink sm:text-4xl">Order summary</h1>
        <p className="mt-1 font-mono text-xs text-stone">
          Ref: {order.view_token.slice(0, 12)}…
        </p>

        <div className="mt-8 space-y-3">
          {order.items.map((i) => (
            <div
              key={i.id}
              className="flex items-start justify-between gap-4 rounded-card border border-line bg-paper p-4"
            >
              <div className="min-w-0">
                <div className="text-sm font-bold text-ink">
                  {i.quantity} × {i.size_ft} ft sheet
                </div>
                {i.notes && (
                  <div className="mt-0.5 text-xs text-stone">{i.notes}</div>
                )}
              </div>
              <div className="font-mono text-base font-bold text-ink">
                ${i.line_total.toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <dl className="mt-8 space-y-2 border-t border-line pt-5 text-sm">
          <Row label="Subtotal" value={`$${order.subtotal.toFixed(2)}`} />
          <Row
            label={order.shipping_fee === 0 ? "Shipping (free)" : "Shipping"}
            value={`$${order.shipping_fee.toFixed(2)}`}
          />
          {order.is_rush && <Row label="Rush" value={`$${order.rush_fee.toFixed(2)}`} />}
          {order.tax > 0 && <Row label="Tax" value={`$${order.tax.toFixed(2)}`} />}
          <Row label="Total" value={`$${order.total.toFixed(2)}`} bold />
        </dl>

        <div className="mt-10 text-center">
          <Link to="/" className="font-mono text-xs uppercase tracking-[0.18em] text-stone underline">
            Back to home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={bold ? "text-lg font-bold text-ink" : "text-stone"}>{label}</dt>
      <dd className={bold ? "font-mono text-xl font-bold text-ink" : "font-mono text-ink"}>
        {value}
      </dd>
    </div>
  );
}

function StatusBanner({
  status,
  timedOut,
  checkout,
}: {
  status: string;
  timedOut: boolean;
  checkout: "success" | "cancel" | undefined;
}) {
  if (status === "paid") {
    return (
      <div className="rounded-card border border-ember/30 bg-dawn p-5">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">Payment confirmed</p>
        <p className="mt-2 text-lg text-ink">Thanks — we'll send a confirmation email shortly.</p>
      </div>
    );
  }
  if (status === "issue") {
    return (
      <div className="rounded-card border border-ember/30 bg-dawn p-5">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">Under review</p>
        <p className="mt-2 text-lg text-ink">
          We're reviewing your payment — we'll email you shortly. No action needed on your end.
        </p>
      </div>
    );
  }
  if (status === "new" && checkout === "success") {
    if (timedOut) {
      return (
        <div className="rounded-card border border-line bg-paper p-5">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-stone">All set</p>
          <p className="mt-2 text-lg text-ink">
            Your payment went through — your confirmation will arrive by email shortly.
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-card border border-line bg-paper p-5">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-stone">Finalizing</p>
        <p className="mt-2 text-lg text-ink">Finalizing your payment…</p>
      </div>
    );
  }
  if (checkout === "cancel") {
    return (
      <div className="rounded-card border border-line bg-paper p-5">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-stone">Checkout canceled</p>
      </div>
    );
  }
  return null;
}
