/**
 * Squared chip — cohort badges, tags, counts. ISB recipe: 2px radius,
 * Inter 700 ~11px uppercase, .08em tracking. No pills.
 *   brand   → solid #245bff / white   (ISB --tag-background-colour)
 *   neutral → white / #cfdbe2 hairline outline, indigo text
 *   accent  → warm peach / navy text  (cohort highlights; sparingly)
 */
export default function Badge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "brand" | "accent" | "neutral";
  className?: string;
}) {
  const variants: Record<"brand" | "accent" | "neutral", string> = {
    brand: "bg-brand-light text-white",
    accent: "bg-accent text-brand-dark",
    neutral: "border border-border bg-white text-brand",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-input px-2.5 py-1 text-[11px] font-bold uppercase leading-none tracking-[0.08em] ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
