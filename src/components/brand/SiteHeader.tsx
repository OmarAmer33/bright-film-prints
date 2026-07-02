import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/bright-transfers-logo.png.asset.json";
import { useCart } from "@/lib/cart-store";




const nav = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQ" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/account", label: "Account" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 group" aria-label="Bright Transfers — home">
          <img
            src={logoAsset.url}
            alt=""
            aria-hidden
            className="h-10 w-10 object-contain"
          />
          <span className="font-display text-lg font-extrabold tracking-tight text-ink">
            Bright Transfers
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

        <div className="flex items-center gap-2">
          <CartLink />
          <Link
            to="/upload"
            className="inline-flex items-center rounded-pill bg-ink px-4 py-2 text-sm font-bold text-paper transition-colors hover:bg-ink/85"
          >
            Start order
          </Link>
        </div>
      </div>
    </header>
  );
}

function CartLink() {
  const count = useCart((s) => s.items.length);
  return (
    <Link
      to="/cart"
      className="relative inline-flex items-center rounded-pill border border-line bg-paper px-3 py-2 text-sm font-medium text-ink/80 transition-colors hover:text-ink"
      aria-label={`Cart (${count} item${count === 1 ? "" : "s"})`}
    >
      Cart
      {count > 0 && (
        <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ember px-1.5 text-[11px] font-bold text-paper">
          {count}
        </span>
      )}
    </Link>
  );
}

