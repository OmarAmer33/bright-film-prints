import { deriveSheetLengthIn, UNREADABLE_SIZE_MSG } from "./pricing-core";

export { UNREADABLE_SIZE_MSG };

// Server-authoritative gang-sheet length. Reads the uploads row and derives the
// length; fails closed — never falls back to a client-supplied number.
export async function resolveSheetLengthIn(upload_id: string): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("uploads")
    .select("width_px, height_px, width_in, height_in")
    .eq("id", upload_id)
    .maybeSingle();
  if (error || !data) throw new Error(UNREADABLE_SIZE_MSG);
  const len = deriveSheetLengthIn({
    width_px: data.width_px,
    height_px: data.height_px,
    width_in: data.width_in === null ? null : Number(data.width_in),
    height_in: data.height_in === null ? null : Number(data.height_in),
  });
  if (len === null) throw new Error(UNREADABLE_SIZE_MSG);
  return len;
}
