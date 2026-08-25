import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { Sunburst } from "@/components/brand/Sunburst";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Bright Transfers" },
      { name: "description", content: "Answers to common DTF gang sheet questions: file prep, peel temps, shipping, and more." },
      { property: "og:title", content: "FAQ — Bright Transfers" },
      { property: "og:description", content: "Answers to common DTF gang sheet questions." },
    ],
  }),
  component: FAQ,
});

function ConfirmPill() {
  return (
    <span className="inline-flex items-center rounded-pill border border-dashed border-stone/50 bg-dawn px-2 py-0.5 align-middle text-[11px] font-mono uppercase tracking-wide text-stone">
      confirm
    </span>
  );
}

type QA = { q: string; a: ReactNode };

const FAQS: QA[] = [
  {
    q: "What's a DTF gang sheet?",
    a: "A single sheet of direct-to-film transfers with as many designs as you can fit, ready to heat-press onto fabric. Cut out what you need and press.",
  },
  {
    q: "What sizes do you offer?",
    a: "Every sheet is 22 inches wide. Order by the linear foot, from a 3-foot minimum up to 30 feet — longer sheets cost less per square foot.",
  },
  {
    q: "What file should I upload?",
    a: "A print-ready PNG with a transparent background works best. Higher resolution presses cleaner; low-res art may look soft once printed.",
  },
  {
    q: "How do I press the transfers?",
    a: (
      <>
        These are hot-peel transfers. <ConfirmPill /> Exact temperature, time, and pressure — plus a
        note on letting small or detailed prints cool before peeling.
      </>
    ),
  },
  {
    q: "How fast is turnaround?",
    a: (
      <>
        <ConfirmPill /> Turnaround time and any daily cutoff.
      </>
    ),
  },
  {
    q: "What does shipping cost?",
    a: (
      <>
        Flat $6.99, free on orders over $75. Carrier <ConfirmPill />.
      </>
    ),
  },
  {
    q: "Do you offer glitter, UV, or specialty transfers?",
    a: "Not yet. We do standard 5-color, hot-peel DTF film, done well. More styles may come later.",
  },
  {
    q: "Do I earn anything for ordering?",
    a: "Yes — earn 10% back in rewards on every order once you have an account, to use on your next one.",
  },
  {
    q: "What if something's wrong with my order?",
    a: (
      <>
        <ConfirmPill /> Reprint / return policy.
      </>
    ),
  },
];

function FAQ() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <Sunburst rotate={14} className="-top-28 right-[-14%] h-[380px] w-[380px] opacity-[0.06] blur-[2px]" />
          <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">FAQ</p>
            <h1 className="mt-3 text-4xl text-ink sm:text-5xl">Questions, answered.</h1>

            <div className="mt-10 divide-y divide-line border-t border-line">
              {FAQS.map((f) => (
                <div key={f.q} className="py-6">
                  <p className="font-medium text-ink">{f.q}</p>
                  <p className="mt-2 text-ink/70">{f.a}</p>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <Link
                to="/contact"
                className="inline-flex items-center rounded-pill border border-ink/15 px-6 py-3 text-sm font-bold text-ink transition-colors hover:border-ink/40 hover:bg-dawn"
              >
                Still stuck? Contact us →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
