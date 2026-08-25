import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { Sunburst } from "@/components/brand/Sunburst";
import { getPricing, type PricingPayload } from "@/lib/pricing.functions";

const FALLBACK_TIERS = [
  { size_ft: 3, price: 19.99, per_sqft: 3.63 },
  { size_ft: 5, price: 30.99, per_sqft: 3.38 },
  { size_ft: 7, price: 40.99, per_sqft: 3.19 },
  { size_ft: 10, price: 54.99, per_sqft: 3.0 },
  { size_ft: 15, price: 76.99, per_sqft: 2.8 },
  { size_ft: 20, price: 97.99, per_sqft: 2.67 },
  { size_ft: 30, price: 139.99, per_sqft: 2.55 },
];

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Bright Transfers" },
      { name: "description", content: "Pay by the square foot. Transparent DTF gang sheet pricing. Full table coming soon." },
      { property: "og:title", content: "Pricing — Bright Transfers" },
      { property: "og:description", content: "Pay by the square foot. Transparent DTF gang sheet pricing." },
    ],
  }),
  loader: async (): Promise<PricingPayload | null> => {
    try {
      return await getPricing();
    } catch (e) {
      console.error("[pricing loader]", e);
      return null;
    }
  },
  errorComponent: ({ reset }) => (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="text-3xl text-ink">Something went sideways.</h1>
      <button onClick={reset} className="mt-6 rounded-pill bg-ink px-5 py-2 text-sm font-bold text-paper">
        Try again
      </button>
    </div>
  ),
  notFoundComponent: () => <div className="p-20 text-center">Not found</div>,
  component: PricingPage,
});

function PricingPage() {
  const data = Route.useLoaderData();
  const tiers = data?.tiers ?? FALLBACK_TIERS;
  const freeShip = data?.settings?.free_ship_threshold ?? 75;

  const lowestPerSqFt = Math.min(...tiers.map((t) => t.per_sqft));

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <PricingTable tiers={tiers} lowestPerSqFt={lowestPerSqFt} />
        <HowPricingWorks />
        <Callouts freeShip={freeShip} />
        <ClosingCTA />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <Sunburst float className="-top-40 right-[-10%] h-[460px] w-[460px] opacity-[0.11] blur-[2px]" />
      <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 md:py-16">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">Pricing</p>
        <h1 className="mt-4 text-4xl text-ink sm:text-5xl">Pay by the square foot.</h1>
        <p className="mt-5 max-w-2xl text-lg text-ink/70 sm:text-xl">
          The bigger the sheet, the less you pay per square foot — and you earn 10% back on every
          order. Priced to beat the big DTF sites, without the clutter.
        </p>
      </div>
    </section>
  );
}

function BestValuePill() {
  return (
    <span className="ml-2 inline-flex items-center rounded-pill bg-ink px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-paper align-middle">
      Best value
    </span>
  );
}

function PricingTable({
  tiers,
  lowestPerSqFt,
}: {
  tiers: { size_ft: number; price: number; per_sqft: number }[];
  lowestPerSqFt: number;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-16">
      <div className="md:rounded-card md:border md:border-line md:bg-paper md:p-4 md:shadow-warm/40">
        {/* Desktop table (md+) */}
        <table className="hidden w-full border-collapse md:table">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="px-5 py-4 text-left font-mono text-xs uppercase tracking-wide text-stone">
                Sheet size
              </th>
              <th scope="col" className="px-5 py-4 text-right font-mono text-xs uppercase tracking-wide text-stone">
                Price
              </th>
              <th scope="col" className="px-5 py-4 text-right font-mono text-xs uppercase tracking-wide text-stone">
                Per sq ft
              </th>
              <th scope="col" className="px-5 py-4 text-right font-mono text-xs uppercase tracking-wide text-stone">
                After 10% rewards
              </th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => {
              const isBest = t.per_sqft === lowestPerSqFt;
              const afterRewards = t.price * 0.9;
              return (
                <tr
                  key={t.size_ft}
                  className={isBest ? "border-t border-line bg-dawn/60" : "border-t border-line"}
                >
                  <td className="px-5 py-4">
                    <span className="font-mono text-base text-ink">{t.size_ft} ft</span>
                    {isBest ? <BestValuePill /> : null}
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-base text-ink">
                    ${t.price.toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-base text-ink">
                    ${t.per_sqft.toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-base text-ink">
                    ${afterRewards.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Mobile cards (below md) */}
        <ul className="grid gap-3 md:hidden">
          {tiers.map((t) => {
            const isBest = t.per_sqft === lowestPerSqFt;
            const afterRewards = t.price * 0.9;
            return (
              <li
                key={t.size_ft}
                className={
                  "rounded-card border border-line p-5 " + (isBest ? "bg-dawn/60" : "bg-paper")
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-2xl font-extrabold text-ink">
                    {t.size_ft} ft
                    {isBest ? <BestValuePill /> : null}
                  </span>
                  <span className="font-mono text-2xl font-bold text-ink">
                    ${t.price.toFixed(2)}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-stone">Per sq ft</dt>
                    <dd className="text-ink">${t.per_sqft.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-stone">After 10% rewards</dt>
                    <dd className="text-ink">${afterRewards.toFixed(2)}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-4 text-center font-mono text-xs text-stone">
        Every sheet is 22 inches wide.
      </p>
    </section>
  );
}

function HowPricingWorks() {
  const points = [
    {
      title: "22-inch-wide film",
      body: "Every sheet is fixed at 22 inches wide — you only pay for the length you print.",
    },
    {
      title: "Sold by the linear foot",
      body: "Order from a 3-foot minimum up to 30 feet, priced by the linear foot.",
    },
    {
      title: "Bigger = cheaper",
      body: "The per-square-foot rate drops as the sheet grows, so larger orders save more.",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-16">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">How our pricing works</p>
      <h2 className="mt-3 text-3xl text-ink sm:text-4xl">Simple, by the foot.</h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {points.map((p) => (
          <div
            key={p.title}
            className="rounded-card border border-line bg-paper p-6 shadow-warm/40"
          >
            <h3 className="text-xl text-ink">{p.title}</h3>
            <p className="mt-2 text-ink/70">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Callouts({ freeShip }: { freeShip: number }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-16">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-card border border-line bg-paper p-6 shadow-warm/40">
          <h3 className="text-xl text-ink">Free shipping over ${freeShip}</h3>
          <p className="mt-2 text-ink/70">Flat $6.99 on everything under that.</p>
        </div>
        <div className="rounded-card border border-line bg-paper p-6 shadow-warm/40">
          <h3 className="text-xl text-ink">Earn 10% back</h3>
          <p className="mt-2 text-ink/70">
            Rewards on every order, once you have an account — spend them on your next one.
          </p>
        </div>
      </div>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section className="bg-dawn">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-8 text-center sm:px-6 md:py-16">
        <h2 className="text-3xl text-ink sm:text-4xl md:text-5xl">Ready to print?</h2>
        <p className="mt-4 max-w-xl text-lg text-ink/70">
          Not sure what size you need? Upload your art and our calculator sizes the sheet for you.
        </p>
        <div className="mt-8">
          <Link
            to="/upload"
            className="inline-flex items-center rounded-pill bg-ink px-6 py-3 text-sm font-bold text-paper"
          >
            Start your sheet
          </Link>
        </div>
      </div>
    </section>
  );
}
