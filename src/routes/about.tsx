import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/brand/ComingSoon";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Bright Transfers" },
      { name: "description", content: "Bright Transfers prints DTF gang sheets bright and ships them fast." },
      { property: "og:title", content: "About — Bright Transfers" },
      { property: "og:description", content: "Bright Transfers prints DTF gang sheets bright and ships them fast." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="About"
      title="Our story is being written."
      body="A real about page is coming soon. Short version: we print DTF gang sheets bright and ship them fast."
    />
  ),
});
