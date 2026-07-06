/**
 * Shared domain types for ivi-forum.
 *
 * These mirror the Firestore data model in SPEC.md exactly — every agent
 * (onboarding, directory, forum) imports from here. Do not rename fields.
 */

/** iVi cohort number. */
export type Cohort = 1 | 2 | 3 | 4;

/** One work-experience row (LinkedIn-shaped, stored on MemberProfile). */
export interface ExperienceItem {
  title: string;
  company: string;
  duration: string | null;
  location: string | null;
  description: string | null;
}

/** One education row (LinkedIn-shaped, stored on MemberProfile). */
export interface EducationItem {
  school: string;
  degree: string | null;
  fieldOfStudy: string | null;
  period: string | null;
}

/** `ivi_auth/{emailLower}` — credential record, keyed by lowercased email. */
export interface AuthRecord {
  /** Lowercased email (also the doc id). */
  email: string;
  /** Random UUID minted at signup / first OAuth login → key of `ivi_users`. */
  uid: string;
  /**
   * bcryptjs hash, cost 10. Absent for accounts created via OAuth (Microsoft) —
   * such accounts can only sign in through their provider, never with a password.
   * Never returned by any API.
   */
  passwordHash?: string;
  /** How the account was first created. */
  provider?: 'password' | 'microsoft' | 'otp';
  createdAt: number;
}

/**
 * `ivi_otp/{emailLower}` — a pending email one-time-code (passwordless sign-in).
 * The code itself is bcrypt-hashed; short-lived and attempt-limited.
 */
export interface OtpRecord {
  email: string; // lowercased (also the doc id)
  codeHash: string; // bcrypt hash of the 6-digit code
  name: string; // provisional display name for a brand-new account
  expiresAt: number; // epoch ms
  attempts: number; // verify attempts used against the current code
  sendCount: number; // codes sent in the current rolling window
  windowStartedAt: number; // epoch ms — start of the send-count window
  lastSentAt: number; // epoch ms
  createdAt: number;
}

/** `ivi_users/{uid}` — uid = UUID minted at signup. */
export interface MemberProfile {
  uid: string;
  email: string;
  name: string;
  photoUrl: string | null;
  linkedinUrl: string | null;
  headline: string | null;
  about: string | null;
  location: string | null;
  cohort: Cohort | null;
  startupName: string | null;
  startupDescription: string | null;
  startupWebsite: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  followerCount: number | null;
  connectionCount: number | null;
  /** false until the onboarding form is saved. */
  profileComplete: boolean;
  /** epoch ms — for scrape rate limiting. */
  lastScrapeAt: number | null;
  createdAt: number;
  updatedAt: number;
}

/** `ivi_topics/{topicId}` — topicId = Firestore auto ID. */
export interface Topic {
  id: string;
  title: string; // 1..200 chars
  body: string; // 0..10000 chars, plain text w/ newlines
  tags: string[]; // 0..5, lowercase
  images: string[]; // 0..4 stored object paths (posts/<uid>/<uuid>.<ext>)
  authorUid: string;
  authorName: string; // denormalized
  authorPhotoUrl: string | null;
  createdAt: number;
  lastActivityAt: number; // bumped on every reply
  replyCount: number;
  upCount: number;
  downCount: number;
  score: number; // upCount - downCount (kept transactionally)
}

/** `ivi_topics/{topicId}/replies/{replyId}`. */
export interface Reply {
  id: string;
  topicId: string;
  body: string; // 1..5000 chars
  images: string[]; // 0..4 stored object paths (posts/<uid>/<uuid>.<ext>)
  authorUid: string;
  authorName: string;
  authorPhotoUrl: string | null;
  createdAt: number;
  upCount: number;
  downCount: number;
  score: number;
}

export type VoteTargetType = 'topic' | 'reply';
export type VoteValue = 1 | -1;

/** `ivi_votes/{uid}_{targetId}` — one vote per user per target. */
export interface Vote {
  uid: string;
  targetType: VoteTargetType;
  targetId: string; // topicId or replyId
  topicId: string; // parent topic (same as targetId when targetType=topic)
  value: VoteValue;
  updatedAt: number;
}

/** Fresh counts returned by the vote transaction (`castVote`). */
export interface VoteResult {
  upCount: number;
  downCount: number;
  score: number;
  /** The caller's vote after the toggle — null means "vote removed". */
  myVote: VoteValue | null;
}

/** The authenticated user as exposed by the NextAuth session. */
export interface SessionUser {
  /** = MemberProfile.uid (UUID minted at signup). */
  id: string;
  email: string | null;
  name: string | null;
}

/**
 * Normalized LinkedIn profile — output of `scrapeLinkedInProfile` in
 * `@/lib/linkedin`, before mapping into a MemberProfile prefill.
 */
export interface NormalizedLinkedIn {
  /** Canonical https://www.linkedin.com/in/<slug>. */
  linkedinUrl: string;
  /** The <slug> part of the profile URL. */
  publicIdentifier: string;
  name: string;
  headline: string;
  about: string;
  location: string;
  profilePictureUrl: string;
  currentTitle: string;
  currentCompany: string;
  followerCount: number | null;
  connectionCount: number | null;
  /** LinkedIn "top skills" (capped at 20). */
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
}
