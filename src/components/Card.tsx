/**
 * Flat surface block, ISB/I-Venture recipe: solid white, 1px #cfdbe2 hairline
 * border, ≤6px radius, no shadow by default. Pass `elevated` for the only
 * sanctioned card shadow (0 1px 4px rgba(20,25,55,.06)).
 */
export default function Card({
  children,
  className = "",
  elevated = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** optional: adds the single sanctioned card shadow */
  elevated?: boolean;
}) {
  return (
    <div
      className={`rounded-card border border-border bg-white ${
        elevated ? "shadow-card" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
