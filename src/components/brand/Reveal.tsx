import { useEffect, useRef, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Stagger delay in ms. */
  delay?: number;
  /** Animation duration in ms. */
  duration?: number;
  className?: string;
};

/**
 * Progressive-enhancement scroll reveal.
 *
 * Base markup is fully VISIBLE. The hidden start state lives behind the
 * `.reveal-ready` class on <html>, which is only set by an inline script when
 * JS is available (see src/routes/__root.tsx). No JS / no-JS crawlers / SSR
 * output therefore render everything visible.
 */
export function Reveal({ children, delay = 0, duration = 500, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = (animate: boolean) => {
      if (animate) {
        el.style.animationDuration = `${duration}ms`;
        el.style.animationDelay = `${delay}ms`;
        el.classList.add("animate-in", "fade-in", "slide-in-from-bottom-3", "ease-out");
      }
      el.dataset.revealed = "true";
    };

    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      reveal(false);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.unobserve(entry.target);
            reveal(true);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, duration]);

  return (
    <div ref={ref} className={`bt-reveal ${className}`} data-revealed="false">
      {children}
    </div>
  );
}
