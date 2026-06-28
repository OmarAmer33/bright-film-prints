// Pure pricing/layout helpers. No env access, no secrets — safe to import client-side
// for live UI display. Authoritative pricing still happens server-side in getQuote.

export const GAP = 0.125; // inches of breathing room between designs
export const USABLE_WIDTH = 21.875; // 22" film minus margin
export const TIERS_IN = [36, 60, 84, 120, 180, 240, 360] as const; // 3,5,7,10,15,20,30 ft
export const MIN_TIER_IN = 36;
export const MAX_TIER_IN = 360;

export type SheetBreakdownLine = { size_ft: number; count: number };

export type SheetComputation = {
  per_row: number;
  rows: number;
  length_in: number;
  breakdown: SheetBreakdownLine[];
  over_width: boolean;
};

function inchesToFeet(inches: number): number {
  return Math.round(inches / 12);
}

function smallestTierFor(inches: number): number {
  for (const t of TIERS_IN) {
    if (t >= inches) return t;
  }
  return MAX_TIER_IN;
}

export function snapToTier(inches: number): number {
  if (inches <= MIN_TIER_IN) return MIN_TIER_IN;
  if (inches <= MAX_TIER_IN) return smallestTierFor(inches);
  return MAX_TIER_IN;
}

/**
 * Merge same-size_ft entries into a single line (sum counts). Preserves the
 * order of first occurrence. e.g. [{30,2},{30,1},{5,1}] -> [{30,3},{5,1}].
 */
export function normalizeBreakdown(
  breakdown: SheetBreakdownLine[],
): SheetBreakdownLine[] {
  const out: SheetBreakdownLine[] = [];
  const idx = new Map<number, number>();
  for (const b of breakdown) {
    const size = Number(b.size_ft);
    const count = Math.max(0, Math.floor(Number(b.count) || 0));
    if (!size || !count) continue;
    const existing = idx.get(size);
    if (existing === undefined) {
      idx.set(size, out.length);
      out.push({ size_ft: size, count });
    } else {
      out[existing].count += count;
    }
  }
  return out;
}

/** Compare two breakdowns ignoring tier ordering; sums same-size entries first. */
export function breakdownsEqual(
  a: SheetBreakdownLine[],
  b: SheetBreakdownLine[],
): boolean {
  const na = normalizeBreakdown(a);
  const nb = normalizeBreakdown(b);
  if (na.length !== nb.length) return false;
  const sort = (x: SheetBreakdownLine[]) =>
    [...x].sort((p, q) => p.size_ft - q.size_ft);
  const sa = sort(na);
  const sb = sort(nb);
  for (let i = 0; i < sa.length; i++) {
    if (sa[i].size_ft !== sb[i].size_ft || sa[i].count !== sb[i].count) return false;
  }
  return true;
}

export function describeBreakdown(breakdown: SheetBreakdownLine[]): string {
  const n = normalizeBreakdown(breakdown);
  if (!n.length) return "—";
  return n.map((b) => `${b.count} × ${b.size_ft} ft`).join(" + ");
}

export function computeSheet(input: {
  design_w: number;
  design_h: number;
  qty: number;
}): SheetComputation {
  const design_w = Number(input.design_w) || 0;
  const design_h = Number(input.design_h) || 0;
  const qty = Math.max(1, Math.floor(Number(input.qty) || 0));

  if (design_w > USABLE_WIDTH) {
    return { per_row: 0, rows: 0, length_in: 0, breakdown: [], over_width: true };
  }
  if (design_w <= 0 || design_h <= 0) {
    return { per_row: 0, rows: 0, length_in: 0, breakdown: [], over_width: false };
  }

  const per_row = Math.max(Math.floor(USABLE_WIDTH / (design_w + GAP)), 1);
  const rows = Math.ceil(qty / per_row);
  const length_in = rows * (design_h + GAP) + GAP;

  const breakdown = breakdownForLength(length_in);
  return { per_row, rows, length_in, breakdown, over_width: false };
}

export function breakdownForLength(length_in: number): SheetBreakdownLine[] {
  if (length_in <= 0) return [];
  if (length_in <= MAX_TIER_IN) {
    return normalizeBreakdown([
      { size_ft: inchesToFeet(snapToTier(length_in)), count: 1 },
    ]);
  }
  const full30 = Math.floor(length_in / MAX_TIER_IN);
  const remainder_in = length_in - full30 * MAX_TIER_IN;
  const lines: SheetBreakdownLine[] = [{ size_ft: 30, count: full30 }];
  if (remainder_in > 0.0001) {
    const remainder_size_in =
      remainder_in <= MIN_TIER_IN ? MIN_TIER_IN : smallestTierFor(remainder_in);
    lines.push({ size_ft: inchesToFeet(remainder_size_in), count: 1 });
  }
  return normalizeBreakdown(lines);
}

export function computeWholesalerSheet(input: { length_in: number }): SheetComputation {
  const length_in = Math.max(0, Number(input.length_in) || 0);
  const breakdown = breakdownForLength(length_in);
  return { per_row: 0, rows: 0, length_in, breakdown, over_width: false };
}

export type PricingRow = { size_ft: number; price: number; per_sqft: number };

export type PricedLine = {
  size_ft: number;
  unit_price: number;
  count: number;
  line_total: number;
};

export type Quote = {
  breakdown: SheetBreakdownLine[];
  lines: PricedLine[];
  subtotal: number;
  per_piece: number;
  length_in: number;
  per_row: number;
  rows: number;
  over_width: boolean;
};

export function priceBreakdown(
  breakdown: SheetBreakdownLine[],
  pricing: PricingRow[],
): { lines: PricedLine[]; subtotal: number } {
  const lookup = new Map(pricing.map((r) => [r.size_ft, r.price]));
  const normalized = normalizeBreakdown(breakdown);
  const lines: PricedLine[] = normalized.map((b) => {
    const unit_price = Number(lookup.get(b.size_ft) ?? 0);
    return {
      size_ft: b.size_ft,
      unit_price,
      count: b.count,
      line_total: Number((unit_price * b.count).toFixed(2)),
    };
  });
  const subtotal = Number(lines.reduce((s, l) => s + l.line_total, 0).toFixed(2));
  return { lines, subtotal };
}

export function buildQuote(
  comp: SheetComputation,
  pricing: PricingRow[],
  qty: number,
): Quote {
  const { lines, subtotal } = priceBreakdown(comp.breakdown, pricing);
  const per_piece = qty > 0 ? Number((subtotal / qty).toFixed(2)) : 0;
  return {
    breakdown: normalizeBreakdown(comp.breakdown),
    lines,
    subtotal,
    per_piece,
    length_in: comp.length_in,
    per_row: comp.per_row,
    rows: comp.rows,
    over_width: comp.over_width,
  };
}
