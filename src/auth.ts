/**
 * NextAuth v5 configuration — email + password (Credentials) plus, when
 * configured, "Sign in with Microsoft" (Microsoft Entra ID / Azure AD).
 *
 * Microsoft sign-in is the *verified* path: only someone who controls the
 * mailbox can authenticate, and access is gated to approved domains
 * (ALLOWED_EMAIL_DOMAINS, e.g. isb.edu) via `isEmailAllowed`. The same gate is
 * enforced on password signup, so there's no back door.
 *
 * Server-only: imports Firestore + bcryptjs, so never import this from a client
 * component (use `next-auth/react` there) or from src/proxy.ts (edge-safe).
 */
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { compare } from "bcryptjs";
import { getAuthRecord, getMember, ensureOAuthUser } from "@/lib/firestore";
import { isEmailAllowed } from "@/lib/access";

const MS_PROVIDER_ID = "microsoft-entra-id";

/** Whether Microsoft sign-in is configured (creds present in the environment). */
export const microsoftEnabled = Boolean(
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
    process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
);

/** Pull the verified email out of a Microsoft profile / user object. */
function microsoftEmail(profile: unknown, userEmail?: string | null): string {
  const p = (profile ?? {}) as Record<string, unknown>;
  const candidate =
    (typeof p.email === "string" && p.email) ||
    (typeof p.preferred_username === "string" && p.preferred_username) ||
    (typeof p.upn === "string" && p.upn) ||
    userEmail ||
    "";
  return String(candidate).trim().toLowerCase();
}

function microsoftName(profile: unknown, userName?: string | null): string {
  const p = (profile ?? {}) as Record<string, unknown>;
  if (userName) return userName;
  if (typeof p.name === "string" && p.name) return p.name;
  return "";
}

const credentialsProvider = Credentials({
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
    // OAuth-only accounts (created via Microsoft) have no password hash — they
    // can never sign in through this form.
    if (!record.passwordHash) return null;

    const ok = await compare(password, record.passwordHash);
    if (!ok) return null;

    // Cheap single-doc read for the display name (skeleton profile is created at
    // signup, so this exists; fall back to the email).
    const member = await getMember(record.uid).catch(() => null);
    return {
      id: record.uid,
      email: record.email,
      name: member?.name || record.email,
    };
  },
});

const providers: NextAuthConfig["providers"] = [credentialsProvider];

if (microsoftEnabled) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      // Multitenant: the app lives in our tenant but accepts any org account
      // (ISB included). Defaults to the multitenant "common" endpoint.
      issuer:
        process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ||
        "https://login.microsoftonline.com/common/v2.0",
      authorization: { params: { scope: "openid profile email" } },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/", // the landing page hosts the sign-in / sign-up card
    error: "/", // surface OAuth errors (e.g. non-ISB denied) on the landing
  },
  callbacks: {
    // Gate Microsoft sign-ins to approved emails BEFORE any account is touched.
    signIn({ account, profile, user }) {
      if (account?.provider === MS_PROVIDER_ID) {
        const email = microsoftEmail(profile, user?.email);
        if (!email || !isEmailAllowed(email)) return false; // deny non-ISB
      }
      return true; // password sign-in already validated in authorize()
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === MS_PROVIDER_ID) {
        // First Microsoft sign-in this session: map the verified email to our
        // uid space (linking to an existing password/OAuth account by email, or
        // minting a new skeleton profile).
        const email = microsoftEmail(profile, user?.email);
        const name = microsoftName(profile, user?.name) || email;
        const { uid } = await ensureOAuthUser({ email, name });
        token.id = uid;
        token.email = email;
        token.name = name;
      } else if (user) {
        // Credentials sign-in.
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
