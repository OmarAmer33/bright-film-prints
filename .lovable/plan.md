# Per-foot granular pricing via interpolation

**Scope:** `src/lib/pricing-core.ts` ONLY. No DB/migration, no changes to `getQuote`, `checkout.functions.ts`, `pricing.functions.ts`, the pricing page, or any other file.

## Why this works without touching anything else

Both client live-display and server-authoritative pricing flow through `pricing-core.ts`. `priceBreakdown` is the single chokepoint both sides use, and the checkout tampering check (`breakdownsEqual`) compares normalized breakdowns — which only depend on `size_ft`/`count` values, not on tier lookup — so the reconciliation path stays intact. The 7 `pricing_config` anchor rows remain unchanged; interpolation reads them at runtime.

## Changes (single file: `src/lib/pricing-core.ts`)

1. **Add `snapToFoot`** right after `snapToTier`. Returns whole feet, `ceil`, clamp 3–30:
   ```ts
   export function snapToFoot(inches: number): number {
     const feet = Math.ceil((Number(inches) || 0) / 12);
     if (feet <= 3) return 3;
     if (feet >= 30) return 30;
     return feet;
   }
   ```

2. **Add `priceForFeet`** after the `PricingRow` type declaration. Interpolates linearly between the two nearest anchor rows; clamps to the endpoints outside the range; rounds to 2 dp:
   ```ts
   export function priceForFeet(feet: number, pricing: PricingRow[]): number {
     const anchors = [...pricing]
       .map((r) => ({ size_ft: Number(r.size_ft), price: Number(r.price) }))
       .filter((r) => r.size_ft > 0 && Number.isFinite(r.price))
       .sort((a, b) => a.size_ft - b.size_ft);
     if (!anchors.length) return 0;
     const f = Number(feet) || 0;
     if (f <= anchors[0].size_ft) return anchors[0].price;
     const last = anchors[anchors.length - 1];
     if (f >= last.size_ft) return last.price;
     for (let i = 0; i < anchors.length - 1; i++) {
       const lo = anchors[i];
       const hi = anchors[i + 1];
       if (f >= lo.size_ft && f <= hi.size_ft) {
         if (f === lo.size_ft) return lo.price;
         if (f === hi.size_ft) return hi.price;
         const t = (f - lo.size_ft) / (hi.size_ft - lo.size_ft);
         return Number((lo.price + t * (hi.price - lo.price)).toFixed(2));
       }
     }
     return last.price;
   }
   ```

3. **Repoint `breakdownForLength`** to snap to the foot instead of `snapToTier`/`smallestTierFor`. Keep the `>30 ft` auto-split; remainder also snaps to the foot:
   ```ts
   export function breakdownForLength(length_in: number): SheetBreakdownLine[] {
     if (length_in <= 0) return [];
     if (length_in <= MAX_TIER_IN) {
       return normalizeBreakdown([{ size_ft: snapToFoot(length_in), count: 1 }]);
     }
     const full30 = Math.floor(length_in / MAX_TIER_IN);
     const remainder_in = length_in - full30 * MAX_TIER_IN;
     const lines: SheetBreakdownLine[] = [{ size_ft: 30, count: full30 }];
     if (remainder_in > 0.0001) {
       lines.push({ size_ft: snapToFoot(remainder_in), count: 1 });
     }
     return normalizeBreakdown(lines);
   }
   ```

4. **Repoint `priceBreakdown`** to interpolate via `priceForFeet` instead of exact-match `Map` lookup:
   ```ts
   export function priceBreakdown(
     breakdown: SheetBreakdownLine[],
     pricing: PricingRow[],
   ): { lines: PricedLine[]; subtotal: number } {
     const normalized = normalizeBreakdown(breakdown);
     const lines: PricedLine[] = normalized.map((b) => {
       const unit_price = priceForFeet(b.size_ft, pricing);
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
   ```

## Preserve (unchanged)
- `snapToTier`, `smallestTierFor`, `TIERS_IN` — exported, untouched.
- All other exports and types in the file.
- The `inchesToFeet` helper stays as-is (still used by `snapToTier`/`smallestTierFor`).

## Verification
- `tsgo` typecheck on the project.
- Anchor behavior is exact, NOT interpolated: every anchor foot (3, 5, 7, 10, 15, 20, 30) returns its `pricing_config` price unchanged, via the `if (f === lo.size_ft) return lo.price` / `if (f === hi.size_ft) return hi.price` guards plus the endpoint clamps in `priceForFeet`.
- Interpolation happens ONLY at non-anchor feet. Confirm:
  - 5 ft = exactly $30.99 (anchor, unchanged)
  - 10 ft = exactly $54.99 (anchor, unchanged)
  - 4 ft = $25.49 (interpolated between 3 ft and 5 ft)
  - 6 ft = $35.99 (interpolated between 5 ft and 7 ft)
- Confirm `breakdownsEqual` still resolves identical normalized breakdowns (sizes are still whole-foot `size_ft` values).

## Out of scope
- No DB/migration, no `getQuote`/`pricing.functions.ts`/`checkout.functions.ts`/pricing page edits.
- Anchor rows in `pricing_config` stay as-is.
