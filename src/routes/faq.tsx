import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/brand/ComingSoon";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Bright Transfers" },
      { name: "description", content: "Answers to common DTF gang sheet questions: file prep, peel temps, shipping, and more." },
      { property: "og:title", content: "FAQ — Bright Transfers" },
      { property: "og:description", content: "Answers to common DTF gang sheet questions." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="FAQ"
      title="FAQs coming soon."
      body="File prep, press temps, peel timing, and shipping — all answered in one place."
    />
  ),
});
