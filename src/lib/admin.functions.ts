import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const requireAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const req = getRequest();
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) throw new Error("Not authorized");
  const token = auth.slice("Bearer ".length).trim();
  if (token.split(".").length !== 3) throw new Error("Not authorized");

  const pub = publicClient();
  const { data: claimsRes, error: claimsErr } = await pub.auth.getClaims(token);
  if (claimsErr || !claimsRes?.claims?.sub) throw new Error("Not authorized");
  const sub = claimsRes.claims.sub as string;
  const email = (claimsRes.claims.email as string | undefined) ?? null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", sub)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !row) throw new Error("Not authorized");

  return { ok: true as const, email };
});

export const getIsAdmin = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const req = getRequest();
    const auth = req.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) return { isAdmin: false };
    const token = auth.slice("Bearer ".length).trim();
    if (token.split(".").length !== 3) return { isAdmin: false };

    const pub = publicClient();
    const { data: claimsRes, error: claimsErr } = await pub.auth.getClaims(token);
    if (claimsErr || !claimsRes?.claims?.sub) return { isAdmin: false };
    const sub = claimsRes.claims.sub as string;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", sub)
      .eq("role", "admin")
      .maybeSingle();

    return { isAdmin: !!row };
  } catch {
    return { isAdmin: false };
  }
});
