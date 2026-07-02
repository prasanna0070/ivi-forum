/**
 * Sticky app header (server component — uses auth()).
 * Signed in: Directory / Forum nav + avatar menu / mobile overlay (client island).
 * Signed out: logo only — the landing page hosts the auth card.
 * 56px bar on mobile, 72px on desktop; white with the I-Venture nav shadow.
 */
import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getMember } from "@/lib/firestore";
import HeaderUserMenu from "@/components/HeaderUserMenu";

const NAV_ITEMS = [
  { href: "/directory", label: "Directory" },
  { href: "/forum", label: "Forum" },
];

export default async function Header() {
  const session = await auth();

  let photoUrl: string | null = null;
  if (session?.user?.id) {
    // One cheap doc read for the member photo; never fatal for the chrome.
    const member = await getMember(session.user.id).catch(() => null);
    photoUrl = member?.photoUrl ?? null;
  }

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  const signedIn = Boolean(session?.user?.id);

  return (
    <header className="pt-safe sticky top-0 z-40 bg-white shadow-nav">
      <div className="px-safe mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 md:h-[72px]">
        <Link
          href={signedIn ? "/directory" : "/"}
          className="flex items-center"
          aria-label="iVi Forum home"
        >
          <Image
            src="/brand/ivi-logo.png"
            alt="I-Venture @ ISB"
            width={2000}
            height={402}
            priority
            className="h-7 w-auto md:h-9"
          />
        </Link>

        {signedIn && session?.user ? (
          <HeaderUserMenu
            name={session.user.name ?? session.user.email ?? "Member"}
            photoUrl={photoUrl}
            profileHref={`/profile/${session.user.id}`}
            signOutAction={doSignOut}
            navItems={NAV_ITEMS}
          />
        ) : null}
      </div>
    </header>
  );
}
