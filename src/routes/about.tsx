import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { Sunburst } from "@/components/brand/Sunburst";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Bright Transfers" },
      { name: "description", content: "Bright Transfers is Chai Footman's DTF gang-sheet shop in South Florida — a printer's printer built on quality, fast turnaround, and fair prices." },
      { property: "og:title", content: "About — Bright Transfers" },
      { property: "og:description", content: "Bright Transfers is Chai Footman's DTF gang-sheet shop in South Florida — a printer's printer built on quality, fast turnaround, and fair prices." },
    ],
  }),
  component: About,
});

function About() {
  const values = [
    { title: "Fast turnaround", body: "I want your film in your hands as fast as I can get it there. Speed isn't a feature here — it's the point." },
    { title: "Color that's exactly right", body: "The small details are the whole job. Your prints come out the way you meant them to, every time." },
    { title: "A real person behind it", body: "Pro or first-timer, you're dealing with someone who actually prints — and cares that it's right." },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <Sunburst rotate={-8} className="-top-32 right-[-12%] h-[420px] w-[420px] opacity-[0.11] blur-[2px]" />
          <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">About</p>
            <h1 className="mt-3 text-4xl text-ink sm:text-5xl">Built by printers, for printers.</h1>

            <div className="mt-8 space-y-5 text-lg text-ink/70">
              <p>
                I'm Chai — the printer behind Bright Transfers. I grew up around this work: my dad was a graphic designer back in the early '80s, the guy a lot of South Florida businesses — especially minority-owned ones — went to when they needed their brand done right. That world was in the house long before it became mine.
              </p>
              <p>
                I spent twenty years as a firefighter. When I finally built something of my own, I went back to what I knew — I bought a retiring family friend's manual screen press, found a dryer at a local church, and started printing shirts one at a time. My first-ever online customer took a chance on a stranger; that first job took me eight hours, and I made sure every bit of it was right. She's been like family ever since.
              </p>
              <p>
                I ran that manual press for more than ten years, moved to automatic, and in 2019 switched to DTF printing — and I haven't looked back. I still run Complete Print for the shirt side. Bright Transfers is where the focus lives now: gang sheets, done right.
              </p>
              <p>
                I fell in love with gang sheets because the work is cleaner and the people are my people — other printers who know the industry and speak the language. I know what you're up against: the rush orders, the last-minute changes, the customer who needed it yesterday. So I built Bright Transfers to be the opposite of corporate and cookie-cutter. Call it the printer's printer.
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
              <p className="text-lg text-ink/70">
                From family reunions to a 16,000-shirt run for a voting-rights nonprofit, I've built my name over ten-plus years the honest way: word of mouth. Twenty years of fire service, father of three, and still obsessed with getting your order right.
              </p>
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
