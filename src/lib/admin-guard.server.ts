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

export async function assertAdmin(): Promise<{ sub: string; email: string | null }> {
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
    .from("user_roles").select("user_id").eq("user_id", sub).eq("role", "admin").maybeSingle();
  if (error || !row) throw new Error("Not authorized");
  return { sub, email };
}
