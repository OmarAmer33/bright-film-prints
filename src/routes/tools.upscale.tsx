import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/brand/ComingSoon";

export const Route = createFileRoute("/tools/upscale")({
  head: () => ({
    meta: [
      { title: "Sharpen your art — Bright Transfers" },
      {
        name: "description",
        content: "Upscale low-resolution art for crisp DTF prints. Coming soon.",
      },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="Upscaler"
      title="Art sharpener coming soon."
      body="We're wiring up an AI upscaler so soft files print sharp. Lands in the next round."
    />
  ),
});
