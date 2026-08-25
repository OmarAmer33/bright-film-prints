import type { CSSProperties } from "react";

export function Sunburst({
  className = "",
  float = false,
  rotate,
}: {
  className?: string;
  float?: boolean;
  rotate?: number;
}) {
  const style: CSSProperties | undefined = rotate ? { transform: `rotate(${rotate}deg)` } : undefined;
  return (
    <div
      aria-hidden
      className={`${float ? "bt-animate-float " : ""}bt-sunburst pointer-events-none absolute ${className}`}
      style={style}
    />
  );
}
