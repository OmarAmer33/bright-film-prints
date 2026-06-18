type PriceTickerProps = {
  size: string;
  price: string;
  perSqFt: string;
  className?: string;
};

export function PriceTicker({ size, price, perSqFt, className = "" }: PriceTickerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        "inline-flex items-center gap-3 rounded-pill border border-line bg-paper/80 px-4 py-2 font-mono text-sm text-ink shadow-warm backdrop-blur " +
        className
      }
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="bt-animate-pulse absolute inline-flex h-full w-full rounded-full bg-ember/70 [animation:bt-pulse_1.6s_ease-in-out_infinite]" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ember" />
      </span>
      <span className="font-bold tracking-wide">{size}</span>
      <span aria-hidden className="text-stone">·</span>
      <span className="font-bold text-ink">{price}</span>
      <span aria-hidden className="text-stone">·</span>
      <span className="text-stone">{perSqFt}</span>
    </div>
  );
}
