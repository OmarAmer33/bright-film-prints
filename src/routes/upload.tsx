import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/brand/ComingSoon";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload your art — Bright Transfers" },
      { name: "description", content: "Upload a print-ready PNG and we'll print your DTF gang sheet bright. Coming soon." },
      { property: "og:title", content: "Upload your art — Bright Transfers" },
      { property: "og:description", content: "Upload a print-ready PNG and we'll print your DTF gang sheet bright." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="Upload"
      title="Upload flow coming soon."
      body="We're wiring up secure uploads and instant pricing. Check back in a few days."
    />
  ),
});
