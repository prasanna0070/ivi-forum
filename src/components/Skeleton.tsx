/** Loading placeholder block — size it with className (h-*, w-*). */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-ink/10 ${className}`} />;
}
