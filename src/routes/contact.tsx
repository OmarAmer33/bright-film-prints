import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { Sunburst } from "@/components/brand/Sunburst";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Bright Transfers" },
      { name: "description", content: "Questions about your order, file prep, or wholesale? Get in touch with Bright Transfers." },
      { property: "og:title", content: "Contact — Bright Transfers" },
      { property: "og:description", content: "Questions about your order, file prep, or wholesale? Get in touch." },
    ],
  }),
  component: Contact,
});

function ConfirmPill() {
  return (
    <span className="inline-flex items-center rounded-pill border border-dashed border-stone/50 bg-dawn px-2 py-0.5 align-middle text-[11px] font-mono uppercase tracking-wide text-stone">
      confirm
    </span>
  );
}

function Contact() {
  // contact form deferred until channel + destination decided (CHAI-CONFIRM)
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <Sunburst rotate={-14} className="-top-28 right-[-14%] h-[380px] w-[380px] opacity-[0.10] blur-[2px]" />
          <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">Contact</p>
            <h1 className="mt-3 text-4xl text-ink sm:text-5xl">Get in touch.</h1>
            <p className="mt-5 max-w-2xl text-lg text-ink/70">
              Questions about an order, file prep, or wholesale pricing? We're here to help.
            </p>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <div className="rounded-card border border-line bg-paper p-6 shadow-warm/40">
                <h3 className="text-lg text-ink">Email</h3>
                <p className="mt-2 text-ink/70">
                  <ConfirmPill />{" "}
                  <a href="mailto:hello@brighttransfers.com" className="text-ink underline-offset-4 hover:underline">
                    hello@brighttransfers.com
                  </a>{" "}
                  <span className="text-stone">(placeholder)</span>
                </p>
              </div>
              <div className="rounded-card border border-line bg-paper p-6 shadow-warm/40">
                <h3 className="text-lg text-ink">Phone</h3>
                <p className="mt-2 text-ink/70">
                  <ConfirmPill /> whether to list one
                </p>
              </div>
              <div className="rounded-card border border-line bg-paper p-6 shadow-warm/40">
                <h3 className="text-lg text-ink">Location</h3>
                <p className="mt-2 text-ink/70">Miramar, Florida</p>
              </div>
              <div className="rounded-card border border-line bg-paper p-6 shadow-warm/40">
                <h3 className="text-lg text-ink">Hours</h3>
                <p className="mt-2 text-ink/70">
                  <ConfirmPill />
                </p>
              </div>
            </div>

            <div className="mt-10">
              <Link
                to="/faq"
                className="inline-flex items-center rounded-pill border border-ink/15 px-6 py-3 text-sm font-bold text-ink transition-colors hover:border-ink/40 hover:bg-dawn"
              >
                Looking for a quick answer? Read the FAQ →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
