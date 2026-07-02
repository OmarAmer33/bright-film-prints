import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your account — Bright Transfers" },
      { name: "description", content: "Sign in to view your Bright Transfers orders and rewards balance." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Your account — Bright Transfers" },
      { property: "og:description", content: "Sign in to view your Bright Transfers orders and rewards balance." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setReady(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-10">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink mb-6">
          Your account
        </h1>
        {!ready ? (
          <div className="rounded-2xl border border-line bg-white p-6 text-ink/60">Loading…</div>
        ) : session ? (
          <LoggedInView session={session} />
        ) : (
          <LoggedOutView />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

// ---------------- Logged out ----------------

function LoggedOutView() {
  return (
    <div className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-sm">
      <Tabs defaultValue="signin" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Create account</TabsTrigger>
        </TabsList>
        <TabsContent value="signin" className="pt-6">
          <SignInForm />
        </TabsContent>
        <TabsContent value="signup" className="pt-6">
          <SignUpForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setPending(false);
    if (error) setErr(friendlyError(error.message));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="si-email">Email</Label>
        <Input id="si-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="si-password">Password</Label>
        <Input id="si-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <Button type="submit" disabled={pending} className="w-full rounded-pill bg-ink text-paper hover:bg-ink/85">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    setPending(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim() || undefined },
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    setPending(false);
    if (error) setErr(friendlyError(error.message));
    // On success the onAuthStateChange listener flips the view to logged-in.
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="su-name">Name <span className="text-ink/50 font-normal">(optional)</span></Label>
        <Input id="su-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="su-password">Password</Label>
        <Input id="su-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="text-xs text-ink/50">At least 8 characters.</p>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <Button type="submit" disabled={pending} className="w-full rounded-pill bg-ink text-paper hover:bg-ink/85">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Incorrect email or password.";
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already"))
    return "An account with that email already exists. Try signing in.";
  if (m.includes("email") && m.includes("confirm")) return "Please confirm your email, then sign in.";
  if (m.includes("password") && m.includes("short")) return "Password is too short.";
  return msg;
}

// ---------------- Logged in ----------------

type CustomerRow = { name: string | null; rewards_balance: number | null };
type OrderRow = {
  id: string;
  created_at: string;
  status: string;
  total: number | null;
  view_token: string;
};

function LoggedInView({ session }: { session: Session }) {
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: c } = await supabase
        .from("customers")
        .select("name, rewards_balance")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();
      if (!mounted) return;
      setCustomer((c as CustomerRow | null) ?? { name: null, rewards_balance: 0 });

      const { data: o } = await supabase
        .from("orders")
        .select("id, created_at, status, total, view_token")
        .order("created_at", { ascending: false })
        .limit(25);
      if (!mounted) return;
      setOrders((o as OrderRow[] | null) ?? []);
      setLoadingOrders(false);
    })();
    return () => {
      mounted = false;
    };
  }, [session.user.id]);

  const displayName =
    customer?.name?.trim() ||
    (session.user.user_metadata?.name as string | undefined)?.trim() ||
    session.user.email ||
    "there";

  const rewards = Number(customer?.rewards_balance ?? 0);

  async function onSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-ink/60">Signed in as</p>
            <p className="font-display text-xl font-bold text-ink">Hi, {displayName}</p>
            <p className="text-sm text-ink/60">{session.user.email}</p>
          </div>
          <Button
            variant="outline"
            onClick={onSignOut}
            disabled={signingOut}
            className="rounded-pill"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
        <div className="mt-6 rounded-xl bg-paper border border-line px-4 py-3">
          <p className="text-sm text-ink/60">Rewards balance</p>
          <p className="font-display text-2xl font-extrabold text-ink">${rewards.toFixed(2)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-sm">
        <h2 className="font-display text-lg font-bold text-ink mb-4">Order history</h2>
        {loadingOrders ? (
          <p className="text-ink/60 text-sm">Loading orders…</p>
        ) : !orders || orders.length === 0 ? (
          <p className="text-ink/60 text-sm">
            No orders yet.{" "}
            <Link to="/upload" className="text-ink underline underline-offset-2">
              Start your first order
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {new Date(o.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-ink/60 capitalize">{o.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-ink">
                    ${Number(o.total ?? 0).toFixed(2)}
                  </p>
                  <Link
                    to="/orders/$token"
                    params={{ token: o.view_token }}
                    className="text-xs text-ink/70 hover:text-ink underline underline-offset-2"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
