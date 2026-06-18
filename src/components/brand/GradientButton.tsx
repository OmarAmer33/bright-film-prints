import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

type Variant = "gradient" | "outline";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-display font-bold tracking-tight " +
  "transition-transform duration-200 active:scale-[0.98] focus-visible:outline-none";

const sizes: Record<Size, string> = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

const variants: Record<Variant, string> = {
  // Ink text on the sun gradient — passes WCAG AA across gold→ember.
  // White text on gold/sun fails (~2.6:1 on #FF7A00).
  gradient:
    "text-ink bg-gradient-sun shadow-warm hover:shadow-glow hover:-translate-y-[1px] " +
    "ring-1 ring-inset ring-ember/20",
  outline:
    "text-ink bg-paper border border-ink/15 hover:border-ink/40 hover:bg-dawn",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
};

type AsLink = CommonProps & { to: LinkProps["to"]; href?: never };
type AsAnchor = CommonProps & { href: string; to?: never };

export function GradientButton(props: AsLink | AsAnchor) {
  const { variant = "gradient", size = "md", children, className = "" } = props;
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;

  if ("href" in props && props.href) {
    return (
      <a href={props.href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link to={(props as AsLink).to} className={cls}>
      {children}
    </Link>
  );
}
