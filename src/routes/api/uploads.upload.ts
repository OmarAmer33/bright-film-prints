import { createFileRoute } from "@tanstack/react-router";
import { readImageDims } from "@/lib/image-dims.server";

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "application/pdf"]);
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "application/pdf": "pdf",
};

export const Route = createFileRoute("/api/uploads/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json({ error: "Invalid form data" }, { status: 400 });
        }
        const file = form.get("file");
        if (!(file instanceof File)) {
          return Response.json({ error: "Missing file" }, { status: 400 });
        }
        if (file.size > MAX_BYTES) {
          return Response.json({ error: "File too large (max 50MB)" }, { status: 413 });
        }
        const mime = file.type || "application/octet-stream";
        if (!ALLOWED.has(mime)) {
          return Response.json(
            { error: "Unsupported file type. Use PNG, JPG, or PDF." },
            { status: 415 },
          );
        }

        const bytes = new Uint8Array(await file.arrayBuffer());
        let dims: { width: number; height: number } | null = null;
        if (mime === "image/png" || mime === "image/jpeg") {
          dims = readImageDims(bytes, mime);
        }

        const ext = EXT[mime];
        const id = crypto.randomUUID();
        const path = `${id}.${ext}`;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { error: uploadErr } = await supabaseAdmin.storage
          .from("uploads")
          .upload(path, bytes, { contentType: mime, upsert: false });
        if (uploadErr) {
          console.error("[upload] storage error", uploadErr);
          return Response.json({ error: "Upload failed" }, { status: 500 });
        }

        const { data: signed, error: signErr } = await supabaseAdmin.storage
          .from("uploads")
          .createSignedUrl(path, 60 * 60 * 24);
        if (signErr) {
          console.error("[upload] sign error", signErr);
        }

        const { data: row, error: insertErr } = await supabaseAdmin
          .from("uploads")
          .insert({
            file_url: path,
            width_px: dims?.width ?? null,
            height_px: dims?.height ?? null,
            status: "pending",
          })
          .select("id")
          .single();
        if (insertErr) {
          console.error("[upload] insert error", insertErr);
          return Response.json({ error: "Upload record failed" }, { status: 500 });
        }

        return Response.json({
          id: row.id,
          path,
          signed_url: signed?.signedUrl ?? null,
          width_px: dims?.width ?? null,
          height_px: dims?.height ?? null,
          mime,
        });
      },
    },
  },
});
