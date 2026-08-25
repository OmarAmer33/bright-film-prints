import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { Sunburst } from "@/components/brand/Sunburst";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Bright Transfers" },
      { name: "description", content: "Bright Transfers prints DTF gang sheets bright and ships them fast." },
      { property: "og:title", content: "About — Bright Transfers" },
      { property: "og:description", content: "Bright Transfers prints DTF gang sheets bright and ships them fast." },
    ],
  }),
  component: About,
});

function About() {
  const values = [
    { title: "Brighter prices, honestly.", body: "Pay by the square foot — the bigger the sheet, the lower the rate. No setup fees, no per-color upcharge." },
    { title: "One product, done right.", body: "Standard 5-color, hot-peel DTF film. No glitter, no gimmicks — just clean transfers that press easy." },
    { title: "Fast turnaround, real tracking.", body: "Printed and shipped fast, with tracking the moment it leaves the shop." },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <Sunburst rotate={-8} className="-top-32 right-[-12%] h-[420px] w-[420px] opacity-[0.07] blur-[2px]" />
          <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">About</p>
            <h1 className="mt-3 text-4xl text-ink sm:text-5xl">Built by printers, for printers.</h1>

            <div className="mt-6 rounded-card border border-line bg-dawn p-4 text-sm text-ink/70">
              Draft brand story — to confirm and personalize with Chai.
            </div>

            <div className="mt-8 space-y-5 text-lg text-ink/70">
              <p>
                Bright Transfers comes out of Complete Print, a Miramar, Florida print shop that's
                been putting ink on apparel for years.
              </p>
              <p>
                We started Bright Transfers with one idea: make DTF gang sheets brighter, cheaper,
                and simpler than anyone else. No bloated catalog, no specialty upsells — just great
                transfers at a fair price, shipped fast.
              </p>
              <p>
                Whether you're a wholesale printer ordering by the roll or a family making shirts for
                a reunion, the process is the same: upload, order, press.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {values.map((v) => (
                <div key={v.title} className="rounded-card border border-line bg-paper p-6 shadow-warm/40">
                  <h3 className="text-lg text-ink">{v.title}</h3>
                  <p className="mt-2 text-ink/70">{v.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <Link
                to="/how-it-works"
                className="inline-flex items-center rounded-pill border border-ink/15 px-6 py-3 text-sm font-bold text-ink transition-colors hover:border-ink/40 hover:bg-dawn"
              >
                See how it works →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
