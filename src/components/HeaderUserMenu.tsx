"use client";

/** Avatar dropdown in the header (client island; sign-out is a server action). */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";

export default function HeaderUserMenu({
  name,
  photoUrl,
  profileHref,
  signOutAction,
}: {
  name: string;
  photoUrl?: string | null;
  profileHref: string;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center rounded-full ring-brand/40 transition hover:ring-2 focus:outline-none focus-visible:ring-2"
      >
        <Avatar src={photoUrl} name={name} size={32} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-ink/10 bg-white py-1 shadow-lg"
        >
          <p className="truncate px-4 py-2 text-sm font-medium text-ink">{name}</p>
          <Link
            href={profileHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-ink/80 hover:bg-surface hover:text-brand"
          >
            My profile
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-4 py-2 text-left text-sm text-ink/80 hover:bg-surface hover:text-brand"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
