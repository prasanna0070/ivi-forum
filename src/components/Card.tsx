/** White rounded-xl card with a subtle border (isb.edu-style, not shadow-heavy). */
export default function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-ink/10 bg-white ${className}`}>
      {children}
    </div>
  );
}
