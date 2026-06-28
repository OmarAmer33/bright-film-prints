import { useEffect, useRef, useState } from "react";

export type UploadResult = {
  id: string;
  path: string;
  signed_url: string | null;
  width_px: number | null;
  height_px: number | null;
  mime: string;
};

export function DropZone({
  onUploaded,
  current,
}: {
  onUploaded: (r: UploadResult) => void;
  current: UploadResult | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads/upload", { method: "POST", body: fd });
      const json = (await res.json()) as UploadResult | { error: string };
      if (!res.ok || "error" in json) {
        throw new Error("error" in json ? json.error : "Upload failed");
      }
      onUploaded(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void upload(f);
        }}
        className={
          "flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed bg-paper px-6 py-10 text-center transition-colors " +
          (dragging
            ? "border-ember bg-dawn/40"
            : "border-line hover:border-stone/60 hover:bg-dawn/30")
        }
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        {busy ? (
          <p className="font-mono text-sm text-ink/70">Uploading…</p>
        ) : current ? (
          <>
            <p className="font-mono text-sm text-ink">
              ✓ {current.mime.split("/")[1]?.toUpperCase()} uploaded
              {current.width_px && current.height_px
                ? ` · ${current.width_px}×${current.height_px}px`
                : ""}
            </p>
            <p className="mt-1 text-xs text-stone">Click or drop to replace</p>
          </>
        ) : (
          <>
            <p className="text-lg text-ink">Drop your art here, or click to choose</p>
            <p className="mt-2 text-sm text-stone">PNG, JPG, or PDF · up to 50&nbsp;MB</p>
          </>
        )}
      </label>
      {error && (
        <p className="mt-2 font-mono text-sm text-ember">{error}</p>
      )}
    </div>
  );
}
