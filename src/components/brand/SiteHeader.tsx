import { Link } from "@tanstack/react-router";

const nav = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQ" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 group" aria-label="Bright Transfers — home">
          {/*
            Logo slot. Swap this wordmark for <img src={logoAsset.url} className="h-10 w-auto" />
            once Bright_Transfers_logo_v1_restored.png is uploaded via lovable-assets.
          */}
          <span aria-hidden className="grid h-9 w-9 place-items-center rounded-soft bg-gradient-sun text-ink font-display font-extrabold shadow-warm">
            B
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-ink">
            Bright<span className="text-gradient-sun">Transfers</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm font-medium text-ink/70 transition-colors hover:text-ink"
              activeProps={{ className: "text-ink" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          to="/upload"
          className="inline-flex items-center rounded-pill bg-ink px-4 py-2 text-sm font-bold text-paper transition-colors hover:bg-ink/85"
        >
          Start order
        </Link>
      </div>
    </header>
  );
}
