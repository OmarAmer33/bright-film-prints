import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { GradientButton } from "@/components/brand/GradientButton";
import { DropZone, type UploadResult } from "@/components/upload/DropZone";
import { PRESETS, PresetPicker } from "@/components/upload/PresetPicker";
import {
  computeSheet,
  computeWholesalerSheet,
  USABLE_WIDTH,
  type SheetComputation,
} from "@/lib/pricing-core";
import { getPricing, getQuote, type PricingPayload } from "@/lib/pricing.functions";
import { useCart } from "@/lib/cart-store";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload your art — Bright Transfers" },
      {
        name: "description",
        content:
          "Upload a print-ready PNG, JPG, or PDF, pick a size, and see your DTF gang sheet priced in real time.",
      },
      { property: "og:title", content: "Upload your art — Bright Transfers" },
      {
        property: "og:description",
        content: "Upload, size, and price a DTF gang sheet in seconds.",
      },
    ],
  }),
  loader: async () => {
    try {
      return await getPricing();
    } catch (e) {
      console.error("[upload loader]", e);
      return null;
    }
  },
  errorComponent: ({ reset }) => (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="text-3xl text-ink">Something went sideways.</h1>
      <button
        onClick={reset}
        className="mt-6 rounded-pill bg-ink px-5 py-2 text-sm font-bold text-paper"
      >
        Try again
      </button>
    </div>
  ),
  notFoundComponent: () => <div className="p-20 text-center">Not found</div>,
  component: UploadPage,
});

function UploadPage() {
  const pricing = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <header className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">Upload & price</p>
          <h1 className="font-display-xl mt-3 text-[clamp(2rem,5vw,3.25rem)] text-ink">
            Upload your art, see your price.
          </h1>
          <p className="mt-4 text-lg text-ink/70">
            DIY artists: drop a file, pick a print size, set quantity. Wholesalers: upload your
            print-ready 22"-wide sheet and price by length.
          </p>
        </header>
        <UploadFlow pricing={pricing} />
      </main>
      <SiteFooter />
    </div>
  );
}

function UploadFlow({ pricing }: { pricing: PricingPayload | null }) {
  const [mode, setMode] = useState<"diy" | "wholesaler">("diy");
  const [upload, setUpload] = useState<UploadResult | null>(null);

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="inline-flex rounded-pill border border-line bg-paper p-1">
          {(["diy", "wholesaler"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                "rounded-pill px-4 py-1.5 text-sm font-medium transition-colors " +
                (mode === m ? "bg-ink text-paper" : "text-ink/70 hover:text-ink")
              }
            >
              {m === "diy" ? "DIY art" : "Wholesaler sheet"}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <DropZone current={upload} onUploaded={setUpload} />
        </div>

        {mode === "diy" ? (
          <DiyFlow upload={upload} pricing={pricing} />
        ) : (
          <WholesalerFlow upload={upload} pricing={pricing} />
        )}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-card border border-line bg-paper p-5 text-sm text-ink/70">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone">Heads up</p>
          <ul className="mt-3 space-y-2">
            <li>Hot-peel premium DTF film, 22" wide.</li>
            <li>3 ft minimum sheet. The bigger the sheet, the lower the rate.</li>
            <li>Free shipping over ${pricing?.settings.free_ship_threshold ?? 75}.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function DiyFlow({
  upload,
  pricing,
}: {
  upload: UploadResult | null;
  pricing: PricingPayload | null;
}) {
  const router = useRouter();
  const quoteFn = useServerFn(getQuote);
  const addItem = useCart((s) => s.addItem);

  const [presetId, setPresetId] = useState<string | "custom">("left-chest");
  const [widthIn, setWidthIn] = useState<number>(4);
  const [heightIn, setHeightIn] = useState<number>(4);
  const [ratioLocked, setRatioLocked] = useState(true);
  const [qty, setQty] = useState(12);
  const [submitting, setSubmitting] = useState(false);
  const [addedMsg, setAddedMsg] = useState<string | null>(null);

  // Aspect from uploaded art (heightFactor = h_px / w_px)
  const ratio = useMemo(() => {
    if (upload?.width_px && upload?.height_px) {
      return upload.height_px / upload.width_px;
    }
    return null;
  }, [upload]);

  function applyWidth(w: number) {
    setWidthIn(w);
    if (ratioLocked && ratio) setHeightIn(Number((w * ratio).toFixed(2)));
  }

  function pickPreset(id: string | "custom") {
    setPresetId(id);
    if (id !== "custom") {
      const p = PRESETS.find((x) => x.id === id);
      if (p) applyWidth(p.width_in);
    }
  }

  function rotate() {
    const w = heightIn;
    const h = widthIn;
    setWidthIn(w);
    setHeightIn(h);
  }

  const comp: SheetComputation = useMemo(
    () => computeSheet({ design_w: widthIn, design_h: heightIn, qty }),
    [widthIn, heightIn, qty],
  );

  const livePricing = pricing?.tiers ?? [];
  const liveLines = useMemo(() => {
    const lookup = new Map(livePricing.map((r) => [r.size_ft, r.price]));
    return comp.breakdown.map((b) => {
      const unit = Number(lookup.get(b.size_ft) ?? 0);
      return { ...b, unit_price: unit, line_total: unit * b.count };
    });
  }, [comp.breakdown, livePricing]);
  const subtotal = liveLines.reduce((s, l) => s + l.line_total, 0);
  const perPiece = qty > 0 ? subtotal / qty : 0;

  const effectiveDpi =
    upload?.width_px && widthIn > 0 ? Math.round(upload.width_px / widthIn) : null;

  async function addToCart() {
    if (!upload) return;
    setSubmitting(true);
    setAddedMsg(null);
    try {
      const quote = await quoteFn({
        data: { mode: "diy", design_w: widthIn, design_h: heightIn, qty },
      });
      if (quote.over_width || quote.lines.length === 0) {
        setAddedMsg("Couldn't price this — check your dimensions.");
        return;
      }
      for (const line of quote.lines) {
        addItem({
          source: "upload",
          size_ft: line.size_ft,
          quantity: line.count,
          unit_price: line.unit_price,
          line_total: line.line_total,
          job_qty: qty,
          design_w: widthIn,
          design_h: heightIn,
          per_piece: quote.per_piece,
          upload_id: upload.id,
          preview_url: upload.signed_url ?? undefined,
          label: `${qty} × ${widthIn}″×${heightIn}″ prints`,
        });
      }
      setAddedMsg("Added to cart.");
      router.invalidate();
    } catch (e) {
      console.error(e);
      setAddedMsg("Couldn't add to cart. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <section>
        <SectionHead title="Print size" hint="Placeholder widths — confirm with Chai" />
        <div className="mt-3">
          <PresetPicker selected={presetId} onSelect={pickPreset} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
          <NumField
            label="Width (in)"
            value={widthIn}
            onChange={(v) => {
              setPresetId("custom");
              applyWidth(v);
            }}
          />
          <NumField
            label="Height (in)"
            value={heightIn}
            onChange={(v) => {
              setPresetId("custom");
              setHeightIn(v);
              if (ratioLocked) setRatioLocked(false);
            }}
          />
        </div>
        {ratio && (
          <label className="mt-2 inline-flex items-center gap-2 text-xs text-stone">
            <input
              type="checkbox"
              checked={ratioLocked}
              onChange={(e) => setRatioLocked(e.target.checked)}
            />
            Lock height to art aspect ratio
          </label>
        )}
      </section>

      <section>
        <SectionHead title="Quantity" />
        <div className="mt-3 max-w-[180px]">
          <NumField label="Pieces" value={qty} onChange={(v) => setQty(Math.max(1, Math.floor(v)))} />
        </div>
      </section>

      <QuotePanel
        comp={comp}
        lines={liveLines}
        subtotal={subtotal}
        perPiece={perPiece}
        qty={qty}
        effectiveDpi={effectiveDpi}
        onRotate={rotate}
        hasUpload={!!upload}
        onAddToCart={addToCart}
        submitting={submitting}
        addedMsg={addedMsg}
      />
    </div>
  );
}

function WholesalerFlow({
  upload,
  pricing,
}: {
  upload: UploadResult | null;
  pricing: PricingPayload | null;
}) {
  const quoteFn = useServerFn(getQuote);
  const addItem = useCart((s) => s.addItem);
  const [lengthIn, setLengthIn] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const comp = useMemo(() => computeWholesalerSheet({ length_in: lengthIn }), [lengthIn]);
  const livePricing = pricing?.tiers ?? [];
  const lines = useMemo(() => {
    const lookup = new Map(livePricing.map((r) => [r.size_ft, r.price]));
    return comp.breakdown.map((b) => {
      const unit = Number(lookup.get(b.size_ft) ?? 0);
      return { ...b, unit_price: unit, line_total: unit * b.count };
    });
  }, [comp.breakdown, livePricing]);
  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);

  // Suggested length from uploaded sheet at 300 DPI (px / 300 = inches)
  const suggested =
    upload?.height_px ? Math.round((upload.height_px / 300) * 10) / 10 : null;

  async function addToCart() {
    if (!upload) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const q = await quoteFn({ data: { mode: "wholesaler", length_in: lengthIn } });
      for (const line of q.lines) {
        addItem({
          source: "upload",
          size_ft: line.size_ft,
          quantity: line.count,
          unit_price: line.unit_price,
          line_total: line.line_total,
          upload_id: upload.id,
          preview_url: upload.signed_url ?? undefined,
          label: `Wholesaler sheet · ${lengthIn}″`,
        });
      }
      setMsg("Added to cart.");
    } catch (e) {
      console.error(e);
      setMsg("Couldn't add to cart.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <section>
        <SectionHead
          title="Sheet length"
          hint="Confirm the printed length of your 22″-wide sheet"
        />
        <div className="mt-3 max-w-[220px]">
          <NumField
            label="Length (in)"
            value={lengthIn}
            onChange={(v) => setLengthIn(Math.max(1, v))}
          />
        </div>
        {suggested && (
          <p className="mt-2 text-xs text-stone">
            From your file at 300 DPI: ~{suggested}″ — confirm and adjust.
          </p>
        )}
      </section>

      <div className="rounded-card border border-line bg-paper p-5">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-stone">
          Live quote
        </div>
        <ul className="mt-3 space-y-1.5 text-sm">
          {lines.map((l, i) => (
            <li key={i} className="flex items-center justify-between">
              <span>
                {l.count} × {l.size_ft} ft sheet
              </span>
              <span className="font-mono">${l.line_total.toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
          <span className="font-bold text-ink">Total</span>
          <span className="font-mono text-xl font-bold text-ink">
            ${subtotal.toFixed(2)}
          </span>
        </div>
        <div className="mt-5">
          <GradientButton
            onClick={addToCart}
            disabled={submitting || !upload}
          >
            {submitting ? "Adding…" : upload ? "Add to cart" : "Upload to add"}
          </GradientButton>
          {msg && <p className="mt-2 font-mono text-xs text-stone">{msg}</p>}
        </div>
      </div>
    </div>
  );
}

function QuotePanel({
  comp,
  lines,
  subtotal,
  perPiece,
  qty,
  effectiveDpi,
  onRotate,
  hasUpload,
  onAddToCart,
  submitting,
  addedMsg,
}: {
  comp: SheetComputation;
  lines: { size_ft: number; count: number; unit_price: number; line_total: number }[];
  subtotal: number;
  perPiece: number;
  qty: number;
  effectiveDpi: number | null;
  onRotate: () => void;
  hasUpload: boolean;
  onAddToCart: () => void;
  submitting: boolean;
  addedMsg: string | null;
}) {
  return (
    <div className="rounded-card border border-line bg-paper p-5 shadow-warm/40">
      <div className="font-mono text-xs uppercase tracking-[0.18em] text-stone">Live quote</div>

      {comp.over_width ? (
        <div className="mt-3 rounded-soft border border-ember/40 bg-ember/5 p-3 text-sm text-ink">
          Your design is wider than our {USABLE_WIDTH}″ film.
          <button
            type="button"
            onClick={onRotate}
            className="ml-2 underline decoration-ember decoration-2 underline-offset-4 hover:text-ember"
          >
            Rotate 90°?
          </button>
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-stone">
            <Meta label="Per row" value={comp.per_row || "—"} />
            <Meta label="Rows" value={comp.rows || "—"} />
            <Meta label="Length" value={comp.length_in ? `${comp.length_in.toFixed(1)}″` : "—"} />
          </div>
          <ul className="mt-4 space-y-1.5 text-sm">
            {lines.length === 0 ? (
              <li className="text-stone">Enter a size and quantity.</li>
            ) : (
              lines.map((l, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span>
                    {l.count} × {l.size_ft} ft sheet · ${l.unit_price.toFixed(2)}
                  </span>
                  <span className="font-mono">${l.line_total.toFixed(2)}</span>
                </li>
              ))
            )}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <span className="font-bold text-ink">Total</span>
            <span className="font-mono text-xl font-bold text-ink">
              ${subtotal.toFixed(2)}
            </span>
          </div>
          {qty > 0 && subtotal > 0 && (
            <div className="mt-1 text-right font-mono text-xs text-stone">
              ~${perPiece.toFixed(2)} / piece
            </div>
          )}
        </>
      )}

      {effectiveDpi !== null && <DpiBadge dpi={effectiveDpi} />}

      <div className="mt-5">
        <GradientButton
          onClick={onAddToCart}
          disabled={submitting || !hasUpload || comp.over_width || lines.length === 0}
        >
          {submitting ? "Adding…" : hasUpload ? "Add to cart" : "Upload art to add"}
        </GradientButton>
        {addedMsg && <p className="mt-2 font-mono text-xs text-stone">{addedMsg}</p>}
      </div>
    </div>
  );
}

function DpiBadge({ dpi }: { dpi: number }) {
  // TODO(Chai-confirm): DPI thresholds are soft. DTF on fabric forgives more than paper —
  // confirm the real-world floor for the production printer before launch.
  let tone: "good" | "ok" | "soft" = "good";
  let label = "Print-ready";
  let note = "";
  if (dpi < 150) {
    tone = "soft";
    label = "May look soft";
    note = "We recommend sharpening, but you can still order.";
  } else if (dpi < 300) {
    tone = "ok";
    label = "Should print well";
  }
  const styles: Record<typeof tone, string> = {
    good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
    ok: "border-gold/50 bg-gold/15 text-ink",
    soft: "border-ember/40 bg-ember/10 text-ember",
  };
  return (
    <div className={`mt-4 rounded-soft border px-3 py-2 text-sm ${styles[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="font-bold">{label}</span>
        <span className="font-mono text-xs">{dpi} DPI</span>
      </div>
      {note && (
        <div className="mt-1 text-xs">
          {note}{" "}
          <a href="/tools/upscale" className="underline underline-offset-2">
            Sharpen this?
          </a>
        </div>
      )}
    </div>
  );
}

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {hint && <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">{hint}</span>}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.1"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-soft border border-line bg-paper px-3 py-2 font-mono text-base text-ink outline-none focus:border-ember"
      />
    </label>
  );
}

function Meta({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-soft border border-line bg-dawn/40 px-2 py-1.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">{label}</div>
      <div className="mt-0.5 font-mono text-sm text-ink">{value}</div>
    </div>
  );
}
