/**
 * NextAuth v5 configuration.
 *
 * Sign-in is Google only. Joining is four steps:
 *  1. Sign in with Google (any Google account; it is the durable identity —
 *     ISB student addresses end at graduation, the Google account doesn't).
 *  2. Prove you are ISB: type an ISB address (@isb.edu, or the alumni
 *     @ivi.isb.edu) and enter the 6-digit code mailed to it. That links the
 *     Google account to the member who owns the mailbox (`ivi_google/{sub}`),
 *     so an existing member who verifies their old address keeps their profile.
 *  3. Onboarding (LinkedIn-powered profile).
 *  4. In.
 *
 * A Google session that isn't linked yet carries `googleSub` but no `id`, so
 * every page/API that needs a member (`requireUser`, `requireUserApi`) treats it
 * as signed out and the landing page shows step 2. Sessions from the retired
 * password / email-code sign-in have no `googleSub` and are ignored.
 *
 * Env: AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET (read by Auth.js automatically).
 *
 * Server-only: imports Firestore. Never import from a client component (use
 * `next-auth/react`) or from src/proxy.ts (edge-safe via getToken).
 */
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isEmailAllowed } from "@/lib/access";
import { emailConfigured } from "@/lib/email";
import { getGoogleLink, getMember, linkGoogleAccount } from "@/lib/firestore";

/** Whether ISB mailbox verification can run (an email transport is configured). */
export const otpEnabled = emailConfigured;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/", // the landing page hosts the sign-in card
    error: "/",
  },
  providers: [
    Google({
      // Always show the account chooser: members often have a personal and a
      // work Google account and must pick the one they'll keep using.
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "google" && profile?.sub) {
        token.googleSub = profile.sub;
        token.googleEmail = (profile.email ?? "").toLowerCase();
        token.name = profile.name ?? token.name;
        token.picture = (profile.picture as string | undefined) ?? token.picture;
        token.id = undefined;

        let link = await getGoogleLink(profile.sub);
        // A Google account whose own address is already an approved one (an
        // ISB Google login, or an allowlisted personal address) is verified by
        // Google itself — link it straight away and skip the code step.
        if (
          !link &&
          profile.email_verified === true &&
          token.googleEmail &&
          isEmailAllowed(token.googleEmail)
        ) {
          await linkGoogleAccount({
            sub: profile.sub,
            googleEmail: token.googleEmail,
            isbEmail: token.googleEmail,
            name: profile.name ?? "",
          });
          link = await getGoogleLink(profile.sub);
        }
        if (link) token.id = link.uid;
      } else if (token.googleSub && !token.id) {
        // Pending (step 2). Re-check on each read so the session picks up the
        // link as soon as the mailbox is verified.
        const link = await getGoogleLink(token.googleSub);
        if (link) token.id = link.uid;
      }

      if (token.id && (!token.name || token.name === token.googleEmail)) {
        const member = await getMember(token.id).catch(() => null);
        if (member?.name) token.name = member.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        // Only a Google session linked to a member counts as signed in.
        session.user.id = token.googleSub && token.id ? token.id : "";
        session.user.googleSub = token.googleSub ?? null;
        session.user.googleEmail = token.googleEmail ?? null;
        if (token.email) session.user.email = token.email;
        session.user.name = token.name ?? null;
      }
      return session;
    },
  },
});
