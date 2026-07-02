/**
 * Session helpers shared by every page/route handler.
 * Server-only (imports auth.ts → Firestore).
 */
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMember } from "@/lib/firestore";
import type { MemberProfile, SessionUser } from "@/lib/types";

/** Page variant: no session → redirect to the landing page. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
}

/** API variant: returns null when unauthenticated (caller sends 401). */
export async function requireUserApi(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
}

/**
 * Pages behind onboarding: requires a session AND a completed profile;
 * otherwise redirects to /onboarding.
 */
export async function requireMember(): Promise<{
  user: SessionUser;
  member: MemberProfile;
}> {
  const user = await requireUser();
  const member = await getMember(user.id);
  if (!member || !member.profileComplete) redirect("/onboarding");
  return { user, member };
}
