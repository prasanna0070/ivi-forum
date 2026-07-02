/**
 * Module augmentation for NextAuth v5 — exposes our uid on the session/JWT.
 * `session.user.id` === `MemberProfile.uid` (UUID minted at signup).
 */
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** = MemberProfile.uid (UUID minted at signup). */
      id: string;
      email: string | null;
      name: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** = MemberProfile.uid (UUID minted at signup). */
    id?: string;
  }
}
