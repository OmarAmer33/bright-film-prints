import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { PriceTicker } from "@/components/brand/PriceTicker";
import { GradientButton } from "@/components/brand/GradientButton";
import { TrustRow } from "@/components/brand/TrustRow";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bright Transfers — DTF Gang Sheets, Printed Fast" },
      {
        name: "description",
        content:
          "Vivid, hot-peel DTF gang sheets priced by the square foot. Upload your art or build a sheet — printed bright, pressed easy, shipped fast.",
      },
      { property: "og:title", content: "Bright Transfers — DTF Gang Sheets, Printed Fast" },
      {
        property: "og:description",
        content: "Vivid, hot-peel DTF gang sheets priced by the square foot. Printed bright, shipped fast.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <main>
        <Hero />
        <TrustBand />
        <HowItWorks />
        <PricingTeaser />
        <ClosingCTA />
        {/* Hidden fidelity QA — compare oklch tokens against pure hex anchors. */}
        <FidelitySwatches />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Sun-gradient orb (faint, decorative) */}
      <div
        aria-hidden
        className="bt-animate-float pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full opacity-30 blur-3xl"
        style={{ backgroundImage: "var(--gradient-sun)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-[-10%] h-[380px] w-[380px] rounded-full opacity-20 blur-3xl"
        style={{ backgroundImage: "var(--gradient-sun)" }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 md:pb-28 md:pt-28">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">
          DTF Gang Sheets
        </p>

        <h1 className="font-display-xl mt-5 text-[clamp(2.75rem,7vw,5.5rem)] text-ink">
          Brighter prints at a{" "}
          <span className="text-gradient-sun">brighter price</span>.
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-ink/70 sm:text-xl">
          Hot-peel DTF gang sheets priced by the square foot — the bigger the
          sheet, the lower the rate. 3 ft minimum, shipped fast.
        </p>


        <div className="mt-9 flex flex-wrap items-center gap-3">
          <GradientButton to="/build" size="lg">
            Build a gang sheet →
          </GradientButton>
          <GradientButton to="/upload" size="lg" variant="outline">
            Upload your own
          </GradientButton>
        </div>

        <div className="mt-8">
          <PriceTicker size="3 ft" price="$19.99" perSqFt="$3.63 / sq ft" />
        </div>
      </div>
    </section>
  );
}

function TrustBand() {
  return (
    <section className="border-y border-line bg-dawn/50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <TrustRow
          items={[
            { icon: <Dot />, label: "Hot-peel premium film" },
            { icon: <Dot />, label: "Vivid 5-color print" },
            { icon: <Dot />, label: "Free shipping over $75" },
            { icon: <Dot />, label: "Pressed & shipped fast" },
          ]}
        />
      </div>
    </section>
  );
}

function Dot() {
  return (
    <span className="inline-block h-1.5 w-1.5 rounded-full bg-sun align-middle" />
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Upload or build",
      body: "Drop a print-ready PNG or arrange your art on a gang sheet in the browser.",
    },
    {
      n: "02",
      title: "We print bright",
      body: "Vivid hot-peel DTF, color-matched and pressed-tested before it leaves the shop.",
    },
    {
      n: "03",
      title: "Ships the same day",
      body: "Most orders go out the same business day with free shipping over $75.",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">How it works</p>
          <h2 className="mt-3 text-3xl text-ink sm:text-4xl">From file to fabric in three steps.</h2>
        </div>
      </div>
      <ol className="mt-10 grid gap-5 md:grid-cols-3">
        {steps.map((s) => (
          <li
            key={s.n}
            className="rounded-card border border-line bg-paper p-6 shadow-warm/40 transition-shadow hover:shadow-warm"
          >
            <div className="font-mono text-sm text-stone">{s.n}</div>
            <h3 className="mt-2 text-xl text-ink">{s.title}</h3>
            <p className="mt-2 text-ink/70">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PricingTeaser() {
  const tiers = [
    { size: "1 ft", price: "$9.99", perSqFt: "$5.45 / sq ft" },
    { size: "3 ft", price: "$19.99", perSqFt: "$3.63 / sq ft", featured: true },
    { size: "5 ft", price: "$29.99", perSqFt: "$3.27 / sq ft" },
  ];
  return (
    <section className="bg-dawn/40 border-y border-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">Pricing</p>
            <h2 className="mt-3 text-3xl text-ink sm:text-4xl">Pay by the square foot.</h2>
            <p className="mt-3 max-w-xl text-ink/70">
              The more sheet you buy, the lower the per-square-foot rate. No hidden setup, no per-color fees.
            </p>
          </div>
          <GradientButton to="/pricing" variant="outline">
            See full pricing
          </GradientButton>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.size}
              className={
                "rounded-card border bg-paper p-6 " +
                (t.featured
                  ? "border-ember/40 shadow-glow ring-1 ring-ember/20"
                  : "border-line shadow-warm/30")
              }
            >
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-stone">
                {t.featured ? "Most popular" : "Length"}
              </div>
              <div className="mt-2 font-display text-3xl font-extrabold text-ink">{t.size}</div>
              <div className="mt-4 font-mono text-2xl font-bold text-ink">{t.price}</div>
              <div className="mt-1 font-mono text-sm text-stone">{t.perSqFt}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCTA() {
  // Gradient restraint: dawn-tinted band with a single gradient element (the button).
  return (
    <section className="bg-dawn">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center sm:px-6 md:py-28">
        <h2 className="text-3xl text-ink sm:text-4xl md:text-5xl">
          Ready to see your art on a shirt this week?
        </h2>
        <p className="mt-4 max-w-xl text-lg text-ink/70">
          Upload a PNG, pick a size, and we'll have it printed and on its way — usually same day.
        </p>
        <div className="mt-8">
          <GradientButton to="/upload" size="lg">
            Start your order →
          </GradientButton>
        </div>
      </div>
    </section>
  );
}

function FidelitySwatches() {
  // Hidden visual check: oklch token vs. hex anchor.
  // Reveal by appending ?qa=1 to the URL.
  const isQA =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("qa") === "1";
  if (!isQA) return null;
  const pairs: { name: string; tokenClass: string; hex: string }[] = [
    { name: "paper", tokenClass: "bg-paper", hex: "#FFFFFF" },
    { name: "dawn",  tokenClass: "bg-dawn",  hex: "#FFF7EC" },
    { name: "gold",  tokenClass: "bg-gold",  hex: "#FFC02E" },
    { name: "sun",   tokenClass: "bg-sun",   hex: "#FF7A00" },
    { name: "ember", tokenClass: "bg-ember", hex: "#F5351B" },
    { name: "ink",   tokenClass: "bg-ink",   hex: "#1C1410" },
    { name: "stone", tokenClass: "bg-stone", hex: "#8A7F75" },
    { name: "line",  tokenClass: "bg-line",  hex: "#EFE6DA" },
  ];
  return (
    <section className="border-t border-line bg-paper px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-mono text-sm">QA: oklch token vs. hex anchor</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {pairs.map((p) => (
            <div key={p.name} className="rounded-soft border border-line p-2">
              <div className="font-mono text-xs">{p.name}</div>
              <div className="mt-2 flex gap-1">
                <div className={`h-12 flex-1 rounded ${p.tokenClass}`} title="token" />
                <div className="h-12 flex-1 rounded" style={{ backgroundColor: p.hex }} title={p.hex} />
              </div>
              <div className="mt-1 font-mono text-[10px] text-stone">{p.hex}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
