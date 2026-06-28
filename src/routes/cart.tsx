import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { useCart } from "@/lib/cart-store";
import { createCheckout } from "@/lib/checkout.functions";
import { describeBreakdown } from "@/lib/pricing-core";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Bright Transfers" },
      { name: "description", content: "Review your gang sheets before checkout." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const items = useCart((s) => s.items);
  const remove = useCart((s) => s.removeItem);
  const subtotal = useCart((s) => s.subtotal());
  const checkoutFn = useServerFn(createCheckout);

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCheckout = async () => {
    setError(null);
    setSubmitting(true);
    try {
      // ONE payload entry per job. Server reprices each job exactly once from
      // its dimensions and compares against claimed_breakdown for tamper checks.
      const payload = {
        email: email.trim() || undefined,
        items: items.map((i) => ({
          source: i.source,
          design_w: i.design_w,
          design_h: i.design_h,
          job_qty: i.job_qty,
          length_in: i.length_in,
          upload_id: i.upload_id,
          claimed_breakdown: i.breakdown.map((b) => ({
            size_ft: b.size_ft,
            count: b.count,
          })),
        })),
      };
      const result = await checkoutFn({ data: payload });
      window.location.assign(result.url);
    } catch (e) {
      console.error(e);
      setError((e as Error).message || "Checkout failed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 md:py-16">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">Cart</p>
        <h1 className="mt-3 text-3xl text-ink sm:text-4xl">Your gang sheets</h1>

        {items.length === 0 ? (
          <div className="mt-10 rounded-card border border-line bg-paper p-10 text-center">
            <p className="text-ink/70">Your cart is empty.</p>
            <Link
              to="/upload"
              className="mt-5 inline-flex rounded-pill bg-ink px-5 py-2 text-sm font-bold text-paper"
            >
              Upload art →
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {items.map((i) => (
              <div
                key={i.id}
                className="flex items-start justify-between gap-4 rounded-card border border-line bg-paper p-4"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold text-ink">
                    {i.label ?? (i.source === "upload" ? "Uploaded art" : "Built sheet")}
                  </div>
                  <div className="mt-1 text-xs text-stone">
                    {describeBreakdown(i.breakdown)} sheet{totalSheets(i.breakdown) === 1 ? "" : "s"}
                    {i.per_piece ? ` · ~$${i.per_piece.toFixed(2)} / piece` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-mono text-base font-bold text-ink">
                    ${i.line_total.toFixed(2)}
                  </div>
                  <button
                    onClick={() => remove(i.id)}
                    className="text-xs text-stone underline hover:text-ember"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
              <span className="text-lg font-bold text-ink">Subtotal</span>
              <span className="font-mono text-2xl font-bold text-ink">
                ${subtotal.toFixed(2)}
              </span>
            </div>
            <p className="text-right text-xs text-stone">
              Shipping + tax shown at checkout.
            </p>

            <div className="mt-6 flex flex-col items-stretch gap-3 sm:items-end">
              <div className="w-full sm:max-w-sm">
                <label className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone">
                  Email for receipt (optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-pill border border-line bg-paper px-4 py-2 text-sm text-ink placeholder:text-stone/60 focus:border-ember focus:outline-none"
                />
              </div>
              {error && (
                <p className="text-right text-sm text-ember">{error}</p>
              )}
              <button
                onClick={onCheckout}
                disabled={submitting}
                className="rounded-pill bg-ink px-6 py-3 text-sm font-bold text-paper disabled:cursor-wait disabled:bg-ink/60"
              >
                {submitting ? "Redirecting to Stripe…" : "Checkout →"}
              </button>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function totalSheets(breakdown: { count: number }[]) {
  return breakdown.reduce((s, b) => s + b.count, 0);
}
