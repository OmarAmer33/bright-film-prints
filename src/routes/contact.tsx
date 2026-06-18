import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/brand/ComingSoon";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Bright Transfers" },
      { name: "description", content: "Questions about your order, file prep, or wholesale? Get in touch with Bright Transfers." },
      { property: "og:title", content: "Contact — Bright Transfers" },
      { property: "og:description", content: "Questions about your order, file prep, or wholesale? Get in touch." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="Contact"
      title="Contact form coming soon."
      body="In the meantime, drop us a note through the link in the footer once it's live."
    />
  ),
});
