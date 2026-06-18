import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";

export function ComingSoon({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6 md:py-32">
          <div className="rounded-card border border-line bg-dawn/60 p-10 text-center shadow-warm/30">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">{eyebrow}</p>
            <h1 className="mt-4 text-4xl text-ink sm:text-5xl">{title}</h1>
            <p className="mx-auto mt-4 max-w-xl text-ink/70">{body}</p>
            <div className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-ink/70">
              <Link to="/" className="underline-offset-4 hover:underline">← Back to home</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
