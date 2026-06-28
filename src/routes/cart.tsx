import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { useCart } from "@/lib/cart-store";

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
                className="flex items-center justify-between gap-4 rounded-card border border-line bg-paper p-4"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold text-ink">
                    {i.quantity} × {i.size_ft} ft sheet
                  </div>
                  <div className="mt-0.5 text-xs text-stone">
                    {i.label ?? (i.source === "upload" ? "Uploaded art" : "Built sheet")}
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

            <div className="mt-6 flex flex-col items-end gap-2">
              <button
                disabled
                className="cursor-not-allowed rounded-pill bg-ink/30 px-6 py-3 text-sm font-bold text-paper"
              >
                Checkout (coming in next step)
              </button>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone">
                Stripe checkout lands next
              </p>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
