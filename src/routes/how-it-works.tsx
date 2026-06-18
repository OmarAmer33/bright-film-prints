import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/brand/ComingSoon";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — Bright Transfers" },
      { name: "description", content: "From file to fabric: how Bright Transfers prints and ships your DTF gang sheet." },
      { property: "og:title", content: "How it works — Bright Transfers" },
      { property: "og:description", content: "From file to fabric in three steps." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="How it works"
      title="Walkthrough coming soon."
      body="The full process page — file prep, print, press, ship — is in the works."
    />
  ),
});
