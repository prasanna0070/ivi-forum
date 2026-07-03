/**
 * NextAuth v5 configuration.
 *
 * Two ways in:
 *  - "otp"          — passwordless: a 6-digit code emailed to the address. This
 *                     is the *verified* path (proves mailbox ownership) and is
 *                     gated to approved domains (ALLOWED_EMAIL_DOMAINS, e.g.
 *                     isb.edu). Shown only when email sending is configured.
 *  - "credentials"  — email + password, kept as a fallback so existing accounts
 *                     keep working. Signup is gated to the same domains.
 *
 * Server-only: imports Firestore + bcryptjs. Never import from a client
 * component (use `next-auth/react`) or from src/proxy.ts (edge-safe via getToken).
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getAuthRecord, getMember, verifyOtp } from "@/lib/firestore";

/** Whether passwordless email OTP is available (Gmail sender configured). */
export const otpEnabled = Boolean(
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/", // the landing page hosts the sign-in card
    error: "/",
  },
  providers: [
    // ── Passwordless email OTP (verified) ──────────────────────────────────
    Credentials({
      id: "otp",
      name: "Email code",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const code =
          typeof credentials?.code === "string" ? credentials.code.trim() : "";
        if (!email || !code) return null;

        const result = await verifyOtp({ email, code });
        if (!result.ok) return null;

        const member = await getMember(result.uid).catch(() => null);
        return {
          id: result.uid,
          email,
          name: member?.name || email,
        };
      },
    }),

    // ── Email + password (fallback) ────────────────────────────────────────
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const record = await getAuthRecord(email);
        if (!record || !record.passwordHash) return null;

        const ok = await compare(password, record.passwordHash);
        if (!ok) return null;

        const member = await getMember(record.uid).catch(() => null);
        return {
          id: record.uid,
          email: record.email,
          name: member?.name || record.email,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // Both providers return a fully-resolved user (id = our uid).
      if (user) {
        token.id = user.id;
        token.email = user.email ?? token.email;
        token.name = user.name ?? token.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? token.sub ?? "";
        if (token.email) session.user.email = token.email;
        session.user.name = token.name ?? null;
      }
      return session;
    },
  },
});
