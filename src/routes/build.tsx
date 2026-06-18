import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/brand/ComingSoon";

export const Route = createFileRoute("/build")({
  head: () => ({
    meta: [
      { title: "Build a gang sheet — Bright Transfers" },
      { name: "description", content: "Arrange your art on a DTF gang sheet in the browser. Coming soon." },
      { property: "og:title", content: "Build a gang sheet — Bright Transfers" },
      { property: "og:description", content: "Arrange your art on a DTF gang sheet in the browser. Coming soon." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="Build"
      title="Sheet builder is on its way."
      body="The in-browser gang sheet builder is coming soon. In the meantime, upload a print-ready PNG and we'll handle the rest."
    />
  ),
});
