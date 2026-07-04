import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { CircleUserRound, LogIn, Menu, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import logoAsset from "@/assets/bright-transfers-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart-store";
import { getIsAdmin } from "@/lib/admin.functions";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const nav = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQ" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return session;
}

export function SiteHeader() {
  const session = useAuthSession();
  const isSignedIn = !!session;
  const [isAdmin, setIsAdmin] = useState(false);
  const getIsAdminFn = useServerFn(getIsAdmin);

  useEffect(() => {
    if (!session) { setIsAdmin(false); return; }
    let mounted = true;
    getIsAdminFn().then((r) => { if (mounted) setIsAdmin(r.isAdmin); }).catch(() => { if (mounted) setIsAdmin(false); });
    return () => { mounted = false; };
  }, [session, getIsAdminFn]);

  const [menuOpen, setMenuOpen] = useState(false);

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
          <AccountNavLink isSignedIn={isSignedIn} />
          {isAdmin && (
            <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink" activeProps={{ className: "text-ink" }}>
              <ShieldCheck className="h-4 w-4 text-sun" />
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <CartLink />
          <Link
            to="/upload"
            className="inline-flex items-center rounded-pill bg-ink px-4 py-2 text-sm font-bold text-paper transition-colors hover:bg-ink/85"
          >
            Start order
          </Link>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="inline-flex items-center justify-center rounded-pill border border-line bg-paper p-2 text-ink transition-colors hover:bg-ink/5 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-paper">
              <SheetHeader>
                <SheetTitle className="font-display text-ink">Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-4 flex flex-col gap-1">
                {isSignedIn ? (
                  <>
                    <SheetClose asChild>
                      <Link
                        to="/account"
                        className="inline-flex items-center gap-2 rounded-pill border border-line px-4 py-2.5 text-sm font-medium text-ink"
                      >
                        <CircleUserRound className="h-5 w-5 text-sun" />
                        Account
                      </Link>
                    </SheetClose>
                    {isAdmin && (
                      <SheetClose asChild>
                        <Link to="/admin" className="inline-flex items-center gap-2 rounded-pill border border-line px-4 py-2.5 text-sm font-medium text-ink">
                          <ShieldCheck className="h-5 w-5 text-sun" />
                          Admin
                        </Link>
                      </SheetClose>
                    )}
                  </>
                ) : (
                  <SheetClose asChild>
                    <Link
                      to="/account"
                      className="inline-flex items-center justify-center gap-2 rounded-pill bg-ink px-4 py-2.5 text-sm font-bold text-paper"
                    >
                      <LogIn className="h-4 w-4" />
                      Sign in
                    </Link>
                  </SheetClose>
                )}

                <nav aria-label="Mobile" className="mt-4 flex flex-col border-t border-line/70">
                  {nav.map((item) => (
                    <SheetClose asChild key={item.to}>
                      <Link
                        to={item.to}
                        className="border-b border-line/70 py-3 text-base font-medium text-ink/80 transition-colors hover:text-ink"
                        activeProps={{ className: "text-ink" }}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
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

function AccountNavLink({ isSignedIn }: { isSignedIn: boolean }) {
  if (isSignedIn) {
    return (
      <Link
        to="/account"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink"
        activeProps={{ className: "text-ink" }}
      >
        <CircleUserRound className="h-4 w-4 text-sun" />
        Account
      </Link>
    );
  }
  return (
    <Link
      to="/account"
      className="inline-flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
    >
      <LogIn className="h-4 w-4" />
      Sign in
    </Link>
  );
}
