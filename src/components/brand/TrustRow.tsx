import type { ReactNode } from "react";

type Item = { icon: ReactNode; label: string };

export function TrustRow({ items }: { items: Item[] }) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-stone">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-2">
          <span aria-hidden className="text-sun">{item.icon}</span>
          <span className="font-medium text-ink/80">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
