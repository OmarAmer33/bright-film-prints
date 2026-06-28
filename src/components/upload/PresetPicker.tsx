// Width-only print-size presets. Height comes from the uploaded art's aspect ratio.
// TODO(Chai-confirm): placeholder widths — confirm real numbers before launch.

export type Preset = { id: string; label: string; width_in: number };

export const PRESETS: Preset[] = [
  { id: "left-chest", label: "Left chest", width_in: 4 },
  { id: "youth", label: "Youth front", width_in: 8 },
  { id: "adult", label: "Adult front", width_in: 11 },
  { id: "full-back", label: "Full back", width_in: 12 },
];

export function PresetPicker({
  selected,
  onSelect,
}: {
  selected: string | "custom";
  onSelect: (id: string | "custom") => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {PRESETS.map((p) => {
        const active = selected === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={
              "rounded-soft border px-3 py-2.5 text-left transition-colors " +
              (active
                ? "border-ember bg-dawn shadow-warm/30"
                : "border-line bg-paper hover:border-stone/60")
            }
          >
            <div className="text-sm font-bold text-ink">{p.label}</div>
            <div className="font-mono text-xs text-stone">~{p.width_in}" wide</div>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onSelect("custom")}
        className={
          "rounded-soft border px-3 py-2.5 text-left transition-colors " +
          (selected === "custom"
            ? "border-ember bg-dawn shadow-warm/30"
            : "border-line bg-paper hover:border-stone/60")
        }
      >
        <div className="text-sm font-bold text-ink">Custom</div>
        <div className="font-mono text-xs text-stone">Enter width</div>
      </button>
    </div>
  );
}
