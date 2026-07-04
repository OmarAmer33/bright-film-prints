import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { requireAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Bright Transfers" },
      { name: "description", content: "Admin area." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin — Bright Transfers" },
      { property: "og:description", content: "Admin area." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
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
        {!ready ? (
          <div className="rounded-2xl border border-line bg-white p-6 text-ink/60">Loading…</div>
        ) : !session ? (
          <div className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-sm">
            <p className="text-ink">Admin access requires sign-in.</p>
            <Link to="/account" className="mt-3 inline-block text-ink underline underline-offset-2">
              Go to sign in
            </Link>
          </div>
        ) : (
          <GateCheck />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function GateCheck() {
  const requireAdminFn = useServerFn(requireAdmin);
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "ok"; email: string | null } | { kind: "denied" }
  >({ kind: "loading" });

  useEffect(() => {
    let mounted = true;
    requireAdminFn()
      .then((res) => {
        if (!mounted) return;
        setState({ kind: "ok", email: res.email });
      })
      .catch(() => {
        if (!mounted) return;
        setState({ kind: "denied" });
      });
    return () => {
      mounted = false;
    };
  }, [requireAdminFn]);

  if (state.kind === "loading") {
    return <div className="rounded-2xl border border-line bg-white p-6 text-ink/60">Checking access…</div>;
  }
  if (state.kind === "denied") {
    return (
      <div className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-sm">
        <p className="text-ink">Not authorized — this account does not have admin access.</p>
        <Link to="/" className="mt-3 inline-block text-ink underline underline-offset-2">
          Back to home
        </Link>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-sm">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink mb-2">Admin</h1>
      <p className="text-ink/70">Access granted — signed in as {state.email ?? "unknown"}.</p>
    </div>
  );
}
