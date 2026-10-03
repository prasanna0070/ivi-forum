/**
 * Module augmentation for NextAuth v5 — exposes our uid on the session/JWT.
 * `session.user.id` === `MemberProfile.uid`, and is "" until the Google
 * account is linked to a verified ISB mailbox.
 */
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** = MemberProfile.uid, or "" while the ISB check is pending. */
      id: string;
      email: string | null;
      name: string | null;
      /** Google subject id of the signed-in account (null on legacy sessions). */
      googleSub: string | null;
      /** The Google account's own address. */
      googleEmail: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** = MemberProfile.uid once the Google account is linked. */
    id?: string;
    googleSub?: string;
    googleEmail?: string;
  }
}
