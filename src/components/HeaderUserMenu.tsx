"use client";

/**
 * Header navigation client island (signed-in only).
 * - Desktop (≥md): inline nav links with a 3px indigo active underline + an
 *   avatar dropdown (profile / sign out).
 * - Mobile (<md): a 44px hamburger opening a full-screen #192890 overlay menu
 *   (slides in, body scroll locked, safe-area padded, 44px+ tap targets).
 * Sign-out remains a server action passed from the server Header.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight } from "lucide-react";
import Avatar from "@/components/Avatar";

type NavItem = { href: string; label: string };

export default function HeaderUserMenu({
  name,
  photoUrl,
  profileHref,
  signOutAction,
  navItems = [],
}: {
  name: string;
  photoUrl?: string | null;
  profileHref: string;
  signOutAction: () => Promise<void>;
  /** optional: primary nav links rendered in the bar + overlay */
  navItems?: NavItem[];
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false); // avatar dropdown (desktop)
  const [navOpen, setNavOpen] = useState(false); // full-screen overlay (mobile)
  const ref = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Dismiss the avatar dropdown on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen]);

  // Lock body scroll while the full-screen overlay is open; close on Escape.
  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setNavOpen(false);
    }
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onEscape);
    };
  }, [navOpen]);

  return (
    <div className="flex items-center md:h-full">
      {/* ── desktop: inline nav + avatar dropdown ── */}
      <nav className="hidden md:flex md:h-full md:items-stretch md:gap-8">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex items-center text-base font-semibold text-brand transition-colors hover:text-brand-light"
            aria-current={isActive(item.href) ? "page" : undefined}
          >
            {item.label}
            {isActive(item.href) && (
              <span className="absolute inset-x-0 bottom-0 h-[3px] bg-brand" />
            )}
          </Link>
        ))}
      </nav>

      <div ref={ref} className="relative ml-6 hidden md:block">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Account menu"
          className="flex h-9 w-9 items-center justify-center rounded-full outline-none ring-brand-light/40 transition hover:ring-2 focus-visible:ring-2"
        >
          <Avatar src={photoUrl} name={name} size={36} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-3 w-56 overflow-hidden rounded-card border border-border bg-white py-1 shadow-pop"
          >
            <p className="truncate px-4 py-2 text-sm font-semibold text-brand">{name}</p>
            <Link
              href={profileHref}
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm text-ink transition-colors hover:bg-surface-2 hover:text-brand-light"
            >
              My profile
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="block w-full px-4 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface-2 hover:text-brand-light"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── mobile: hamburger ── */}
      <button
        type="button"
        onClick={() => setNavOpen(true)}
        aria-label="Open menu"
        aria-expanded={navOpen}
        className="flex h-11 w-11 items-center justify-center text-brand md:hidden"
      >
        <Menu size={24} strokeWidth={2} />
      </button>

      {/* ── mobile: full-screen indigo overlay menu ── */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-brand text-white transition-transform duration-500 ease-out md:hidden ${
          navOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
        aria-hidden={!navOpen}
      >
        <div className="pt-safe px-safe">
          <div className="flex h-14 items-center justify-between px-4">
            <Image
              src="/brand/ivi-logo-white.png"
              alt="I-Venture @ ISB"
              width={1920}
              height={389}
              className="h-7 w-auto"
            />
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              aria-label="Close menu"
              className="flex h-11 w-11 items-center justify-center text-white"
            >
              <X size={24} strokeWidth={2} />
            </button>
          </div>
        </div>

        <nav className="px-safe flex flex-1 flex-col overflow-y-auto px-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setNavOpen(false)}
              aria-current={isActive(item.href) ? "page" : undefined}
              className="flex items-center justify-between border-b border-white/20 py-4 text-xl font-bold text-white"
            >
              {item.label}
              <ChevronRight size={22} strokeWidth={2} className="text-white/70" />
            </Link>
          ))}
          <Link
            href={profileHref}
            onClick={() => setNavOpen(false)}
            className="flex items-center justify-between border-b border-white/20 py-4 text-xl font-bold text-white"
          >
            My profile
            <ChevronRight size={22} strokeWidth={2} className="text-white/70" />
          </Link>
        </nav>

        <div className="pb-safe px-safe px-4 pb-6">
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex min-h-[44px] w-full items-center justify-center border border-white text-base font-semibold text-white transition-colors hover:border-mint hover:text-mint"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
