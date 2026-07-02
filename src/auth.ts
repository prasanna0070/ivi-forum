/**
 * NextAuth v5 configuration — email + password (Credentials provider).
 *
 * Server-only: imports Firestore + bcryptjs, so never import this from a
 * client component (use `next-auth/react` there) or from src/proxy.ts
 * (which stays edge-safe via `getToken`).
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getAuthRecord, getMember } from "@/lib/firestore";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/", // the landing page hosts the sign-in / sign-up card
  },
  providers: [
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
        if (!record) return null;

        const ok = await compare(password, record.passwordHash);
        if (!ok) return null;

        // Cheap single-doc read for the display name (skeleton profile is
        // created at signup, so this exists; fall back to the email).
        const member = await getMember(record.uid).catch(() => null);
        return {
          id: record.uid,
          email: record.email,
          name: member?.name || record.email,
        };
      },
    }),

    // ── Google OAuth seam (intentionally deferred — SPEC.md) ────────────────
    // To add Google sign-in later:
    //   1. `import Google from "next-auth/providers/google"` and append
    //      `Google({ allowDangerousEmailAccountLinking: false })` here.
    //   2. Set AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET env vars.
    //   3. In a `signIn` callback, look up/mint the `ivi_auth`/`ivi_users`
    //      records by the Google-verified email so `token.id` keeps pointing
    //      at the same uid space as password accounts.
    // ─────────────────────────────────────────────────────────────────────────
  ],
  callbacks: {
    jwt({ token, user }) {
      // On sign-in, persist our uid + identity onto the JWT.
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
        // AdapterUser types email as non-null inside this callback — only
        // overwrite when the token actually carries one.
        if (token.email) session.user.email = token.email;
        session.user.name = token.name ?? null;
      }
      return session;
    },
  },
});
