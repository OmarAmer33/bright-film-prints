import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { Sunburst } from "@/components/brand/Sunburst";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — Bright Transfers" },
      { name: "description", content: "From file to fabric: how Bright Transfers prints and ships your DTF gang sheet." },
      { property: "og:title", content: "How it works — Bright Transfers" },
      { property: "og:description", content: "From file to fabric in three steps." },
    ],
  }),
  component: HowItWorks,
});

function ConfirmPill() {
  return (
    <span className="inline-flex items-center rounded-pill border border-dashed border-stone/50 bg-dawn px-2 py-0.5 align-middle text-[11px] font-mono uppercase tracking-wide text-stone">
      confirm
    </span>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Upload your art",
      body: "Drop in a print-ready PNG. For the cleanest press, use a transparent background and high-resolution artwork.",
    },
    {
      n: "02",
      title: "We size it automatically",
      body: "Our calculator lays your design across a 22-inch-wide sheet and prices it by the linear foot, from a 3-foot minimum. Add quantity and the price updates live.",
    },
    {
      n: "03",
      title: "Check out",
      body: "Pay securely by card. You'll get an order confirmation by email right away.",
    },
    {
      n: "04",
      title: "We print & ship",
      body: (
        <>
          Your sheet is printed on standard hot-peel DTF film and shipped <ConfirmPill />{" "}
          for carrier and turnaround. You'll get a tracking email when it's on the way.
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <Sunburst rotate={10} className="-top-32 right-[-12%] h-[420px] w-[420px] opacity-[0.07] blur-[2px]" />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">How it works</p>
            <h1 className="mt-3 text-4xl text-ink sm:text-5xl">From your file to your door.</h1>
            <p className="mt-5 max-w-2xl text-lg text-ink/70">
              Bright Transfers turns your artwork into a ready-to-press DTF gang sheet — sized,
              printed, and shipped. No design software, no minimum beyond a single 3-foot sheet.
            </p>

            <ol className="mt-12 grid gap-5 md:grid-cols-2">
              {steps.map((s) => (
                <li
                  key={s.n}
                  className="rounded-card border border-line bg-paper p-6 shadow-warm/40"
                >
                  <div className="font-mono text-sm text-stone">{s.n}</div>
                  <h3 className="mt-2 text-xl text-ink">{s.title}</h3>
                  <p className="mt-2 text-ink/70">{s.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-col gap-2 text-sm text-ink/70">
              <p>
                New to pressing? Exact press temp, time, and peel timing <ConfirmPill />.{" "}
                <Link to="/faq" className="font-medium text-ink underline-offset-4 hover:underline">
                  See the FAQ.
                </Link>
              </p>
              <p>Free shipping over $75, flat $6.99 otherwise.</p>
            </div>

            <div className="mt-10">
              <Link
                to="/upload"
                className="inline-flex items-center rounded-pill bg-ink px-6 py-3 text-sm font-bold text-paper transition-colors hover:bg-ink/85"
              >
                Start your sheet →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
