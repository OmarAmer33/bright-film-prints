import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { requireAdmin } from "@/lib/admin.functions";
import { listAdminOrders, type AdminOrderRow } from "@/lib/admin.orders.functions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-10">
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
  return <AdminOrdersQueue email={state.email} />;
}

const NEUTRAL_STATUSES = new Set([
  "paid",
  "in_production",
  "printed",
  "shipped",
  "delivered",
  "on_hold",
]);

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatMoney(n: number) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

function StatusPill({ status }: { status: string }) {
  const isIssue = status === "issue";
  const isNeutral = NEUTRAL_STATUSES.has(status);
  const cls = isIssue
    ? "border-ember text-ember"
    : isNeutral
      ? "border-line text-ink"
      : "border-line text-stone";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {status}
    </span>
  );
}

function Flags({ row }: { row: AdminOrderRow }) {
  const parts: React.ReactNode[] = [];
  if (row.is_rush) {
    parts.push(
      <span
        key="rush"
        className="inline-flex items-center rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-ink"
      >
        RUSH
      </span>,
    );
  }
  if (row.rewards_redeemed > 0) {
    parts.push(
      <span key="redeemed" className="text-xs text-stone">
        −{formatMoney(row.rewards_redeemed)} redeemed
      </span>,
    );
  }
  if (!row.has_shipping) {
    parts.push(
      <span key="noship" className="text-xs text-ember">
        no ship-to
      </span>,
    );
  }
  if (parts.length === 0) return <span className="text-xs text-stone">—</span>;
  return <div className="flex flex-wrap items-center gap-2">{parts}</div>;
}

function AdminOrdersQueue({ email }: { email: string | null }) {
  const listOrdersFn = useServerFn(listAdminOrders);
  const [rows, setRows] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    listOrdersFn()
      .then((data) => {
        if (!mounted) return;
        setRows(data);
        setError(null);
      })
      .catch(() => {
        if (!mounted) return;
        setError("Could not load orders.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [listOrdersFn]);

  return (
    <div className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Orders</h1>
        <p className="mt-1 text-sm text-stone">Signed in as {email ?? "unknown"}.</p>
      </div>

      {loading ? (
        <div className="text-ink/60">Loading orders…</div>
      ) : error ? (
        <div className="text-ink/70">{error}</div>
      ) : rows.length === 0 ? (
        <div className="text-ink/60">No orders yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-line">
                <TableHead className="text-stone">Date</TableHead>
                <TableHead className="text-stone">Order</TableHead>
                <TableHead className="text-stone">Customer</TableHead>
                <TableHead className="text-stone">Status</TableHead>
                <TableHead className="text-stone">Total</TableHead>
                <TableHead className="text-stone">Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <React.Fragment key={r.id}>
                  <TableRow className="border-line">
                    <TableCell className="text-ink whitespace-nowrap">{formatDate(r.created_at)}</TableCell>
                    <TableCell className="font-mono text-ink">{r.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-ink">{r.email}</TableCell>
                    <TableCell>
                      <StatusPill status={r.status} />
                    </TableCell>
                    <TableCell className="text-ink whitespace-nowrap">{formatMoney(r.total)}</TableCell>
                    <TableCell>
                      <Flags row={r} />
                    </TableCell>
                  </TableRow>
                  {r.status === "issue" && r.notes ? (
                    <TableRow className="border-line">
                      <TableCell colSpan={6} className="text-xs text-ember whitespace-pre-wrap pt-0">
                        {r.notes}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
