import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-dawn/40">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center">
        <div>
          <div className="font-display text-base font-extrabold text-ink">
            Bright<span className="text-gradient-sun">Transfers</span>
          </div>
          <p className="mt-1 text-sm text-stone">DTF gang sheets, printed bright and shipped fast.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/70">
          <Link to="/how-it-works" className="hover:text-ink">How it works</Link>
          <Link to="/pricing" className="hover:text-ink">Pricing</Link>
          <Link to="/faq" className="hover:text-ink">FAQ</Link>
          <Link to="/about" className="hover:text-ink">About</Link>
          <Link to="/contact" className="hover:text-ink">Contact</Link>
        </nav>
        <div className="text-xs text-stone">© {new Date().getFullYear()} Bright Transfers</div>
      </div>
    </footer>
  );
}
