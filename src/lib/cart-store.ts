import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string; // local uuid
  source: "upload" | "builder";
  size_ft: number;
  quantity: number; // sheet count for this size_ft
  unit_price: number; // per-sheet
  line_total: number; // server-priced
  // Original print job context (for display + future order_items materialization)
  job_qty?: number; // number of pieces the customer is making (DIY)
  design_w?: number;
  design_h?: number;
  per_piece?: number;
  upload_id?: string;
  preview_url?: string;
  label?: string; // e.g. "12 × 4×10 prints"
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
    { name: "bt-cart-v1" },
  ),
);
