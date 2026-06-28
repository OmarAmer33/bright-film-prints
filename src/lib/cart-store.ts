import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartBreakdownLine = {
  size_ft: number;
  count: number;
  unit_price: number;
  line_total: number;
};

/**
 * One CartItem = one print job. A job may be priced as multiple sheet tiers
 * (auto-split), but it is still ONE item in the cart, ONE row at checkout,
 * and the server reprices it ONCE from its dimensions.
 */
export type CartItem = {
  id: string;
  source: "upload" | "builder";
  kind: "diy" | "wholesaler";
  // DIY context
  design_w?: number;
  design_h?: number;
  job_qty?: number;
  // Wholesaler context
  length_in?: number;
  // Display + materialization
  upload_id?: string;
  preview_url?: string;
  label?: string;
  per_piece?: number;
  // Full normalized sheet breakdown for this one job
  breakdown: CartBreakdownLine[];
  // Sum of breakdown[].line_total — what this whole job costs.
  line_total: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((s) => ({
          items: [...s.items, { ...item, id: crypto.randomUUID() }],
        })),
      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
      subtotal: () =>
        Number(get().items.reduce((sum, i) => sum + i.line_total, 0).toFixed(2)),
    }),
    { name: "bt-cart-v2" }, // bumped from v1: shape changed (job-per-item)
  ),
);
