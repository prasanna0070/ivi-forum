/**
 * Sticky app header (server component — uses auth()).
 * Signed in: Directory / Forum nav + avatar menu (client island).
 * Signed out: logo only — the landing page hosts the auth card.
 */
import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getMember } from "@/lib/firestore";
import HeaderUserMenu from "@/components/HeaderUserMenu";

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

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/directory" className="flex items-center" aria-label="iVi Forum home">
          <Image
            src="/brand/ivi-logo.png"
            alt="I-Venture @ ISB"
            width={159}
            height={32}
            priority
            className="h-8 w-auto"
          />
        </Link>

        {session?.user?.id ? (
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/directory"
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink/70 hover:bg-surface hover:text-brand"
            >
              Directory
            </Link>
            <Link
              href="/forum"
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink/70 hover:bg-surface hover:text-brand"
            >
              Forum
            </Link>
            <HeaderUserMenu
              name={session.user.name ?? session.user.email ?? "Member"}
              photoUrl={photoUrl}
              profileHref={`/profile/${session.user.id}`}
              signOutAction={doSignOut}
            />
          </nav>
        ) : null}
      </div>
    </header>
  );
}
