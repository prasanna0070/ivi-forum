/** Small rounded-full pill — cohort badges, tags, counts. */
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
    brand: "bg-brand/10 text-brand",
    accent: "bg-accent/30 text-ink",
    neutral: "bg-ink/5 text-ink/70",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
