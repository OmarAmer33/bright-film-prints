import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/brand/ComingSoon";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Bright Transfers" },
      { name: "description", content: "Pay by the square foot. Transparent DTF gang sheet pricing. Full table coming soon." },
      { property: "og:title", content: "Pricing — Bright Transfers" },
      { property: "og:description", content: "Pay by the square foot. Transparent DTF gang sheet pricing." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="Pricing"
      title="Full pricing table coming soon."
      body="Sample rates: 1 ft from $9.99 · 3 ft from $19.99 · 5 ft from $29.99. Larger sheets bring the per-square-foot rate down."
    />
  ),
});
