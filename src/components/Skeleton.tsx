/** Loading placeholder block — flat, small radius. Size it with className
 *  (h-*, w-*); pass rounded-full via className for avatar placeholders. */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[4px] bg-border/70 ${className}`} />;
}
