/**
 * Firestore client (server-side ONLY — never import from a client component).
 *
 * Uses Application Default Credentials: on Cloud Run this is the runtime
 * service account; locally it's `gcloud auth application-default login`.
 * Collections per SPEC.md: ivi_auth, ivi_users (+ private subcollection),
 * ivi_topics (+ replies subcollection), ivi_votes.
 */
import { randomUUID } from 'node:crypto';
import { Firestore } from '@google-cloud/firestore';
import type {
  AuthRecord,
  MemberProfile,
  Reply,
  Topic,
  Vote,
  VoteResult,
  VoteTargetType,
  VoteValue,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Singleton client — cached on globalThis so Next.js dev-mode hot reloads
// (which re-evaluate modules) don't leak gRPC connections.
// ---------------------------------------------------------------------------

const globalForFirestore = globalThis as unknown as { __iviFirestore?: Firestore };

export const db: Firestore =
  globalForFirestore.__iviFirestore ??
  new Firestore({
    // If GCP_PROJECT is unset, leave projectId undefined so ADC infers it.
    projectId: process.env.GCP_PROJECT || undefined,
    // Firestore rejects `undefined` field values by default; ignoring them lets
    // callers pass Partial<...> objects without scrubbing.
    ignoreUndefinedProperties: true,
  });

if (!globalForFirestore.__iviFirestore) globalForFirestore.__iviFirestore = db;

const AUTH = 'ivi_auth';
const USERS = 'ivi_users';
const TOPICS = 'ivi_topics';
const REPLIES = 'replies'; // subcollection of ivi_topics/{id}
const VOTES = 'ivi_votes';

// ---------------------------------------------------------------------------
// Auth records (ivi_auth) — read ONLY by auth.ts and the signup route.
// ---------------------------------------------------------------------------

/** Fetch the credential record for a (lowercased) email, or null. */
export async function getAuthRecord(emailLower: string): Promise<AuthRecord | null> {
  const snap = await db.collection(AUTH).doc(emailLower.toLowerCase()).get();
  return snap.exists ? (snap.data() as AuthRecord) : null;
}

/**
 * Signup: transactionally create `ivi_auth/{emailLower}` plus a skeleton
 * `ivi_users/{uid}` (profileComplete=false). The caller hashes the password.
 * Returns `{ok:false, error:'email-exists'}` when the email is already taken.
 */
export async function createAuthUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<{ ok: true; uid: string } | { ok: false; error: 'email-exists' }> {
  const emailLower = input.email.trim().toLowerCase();
  const authRef = db.collection(AUTH).doc(emailLower);
  const uid = randomUUID();
  const now = Date.now();

  const created = await db.runTransaction(async (tx) => {
    const existing = await tx.get(authRef);
    if (existing.exists) return false;

    const authRecord: AuthRecord = { email: emailLower, uid, passwordHash: input.passwordHash, createdAt: now };
    const skeleton: MemberProfile = {
      uid,
      email: emailLower,
      name: input.name,
      photoUrl: null,
      linkedinUrl: null,
      headline: null,
      about: null,
      location: null,
      cohort: null,
      startupName: null,
      startupDescription: null,
      startupWebsite: null,
      currentTitle: null,
      currentCompany: null,
      skills: [],
      experience: [],
      education: [],
      followerCount: null,
      connectionCount: null,
      profileComplete: false,
      lastScrapeAt: null,
      createdAt: now,
      updatedAt: now,
    };
    tx.create(authRef, authRecord);
    tx.set(db.collection(USERS).doc(uid), skeleton);
    return true;
  });

  return created ? { ok: true, uid } : { ok: false, error: 'email-exists' };
}

// ---------------------------------------------------------------------------
// Members (ivi_users)
// ---------------------------------------------------------------------------

/** Fetch a member profile by uid, or null. */
export async function getMember(uid: string): Promise<MemberProfile | null> {
  const snap = await db.collection(USERS).doc(uid).get();
  return snap.exists ? (snap.data() as MemberProfile) : null;
}

/** Merge-write fields onto `ivi_users/{uid}` (always bumps updatedAt). */
export async function upsertMember(uid: string, data: Partial<MemberProfile>): Promise<void> {
  await db
    .collection(USERS)
    .doc(uid)
    .set({ ...data, uid, updatedAt: Date.now() }, { merge: true });
}

/**
 * All members with profileComplete == true, ordered by name.
 * Sorted in memory (cohort ≈ dozens–hundreds of docs) so no composite index
 * (profileComplete + name) needs to exist on a fresh project.
 */
export async function listMembers(): Promise<MemberProfile[]> {
  const snap = await db.collection(USERS).where('profileComplete', '==', true).get();
  return snap.docs
    .map((d) => d.data() as MemberProfile)
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
}

/**
 * Store the raw Apify payload at `ivi_users/{uid}/private/scrape` — never
 * rendered, kept for future re-parsing (SPEC Data model).
 */
export async function saveScrapeRaw(uid: string, raw: unknown): Promise<void> {
  await db
    .collection(USERS)
    .doc(uid)
    .collection('private')
    .doc('scrape')
    // JSON round-trip strips undefineds/class instances Firestore can't store.
    .set({ raw: JSON.parse(JSON.stringify(raw ?? null)), savedAt: Date.now() });
}

// ---------------------------------------------------------------------------
// Topics (ivi_topics)
// ---------------------------------------------------------------------------

export type TopicSort = 'new' | 'top' | 'active';
export type ReplySort = 'new' | 'top';

const TOPIC_ORDER_FIELD: Record<TopicSort, keyof Topic> = {
  new: 'createdAt',
  top: 'score',
  active: 'lastActivityAt',
};

/** Fetch a topic by id, or null. */
export async function getTopic(id: string): Promise<Topic | null> {
  const snap = await db.collection(TOPICS).doc(id).get();
  return snap.exists ? ({ ...(snap.data() as Topic), id: snap.id }) : null;
}

/** Topic list for a forum tab. Single-field desc order → auto-indexed. */
export async function listTopics(sort: TopicSort, limit = 50): Promise<Topic[]> {
  const snap = await db.collection(TOPICS).orderBy(TOPIC_ORDER_FIELD[sort], 'desc').limit(limit).get();
  return snap.docs.map((d) => ({ ...(d.data() as Topic), id: d.id }));
}

/** Create a topic. Caller validates lengths/tags per SPEC. */
export async function createTopic(input: {
  title: string;
  body: string;
  tags: string[];
  authorUid: string;
  authorName: string;
  authorPhotoUrl: string | null;
}): Promise<Topic> {
  const ref = db.collection(TOPICS).doc();
  const now = Date.now();
  const topic: Topic = {
    id: ref.id,
    title: input.title,
    body: input.body,
    tags: input.tags,
    authorUid: input.authorUid,
    authorName: input.authorName,
    authorPhotoUrl: input.authorPhotoUrl,
    createdAt: now,
    lastActivityAt: now,
    replyCount: 0,
    upCount: 0,
    downCount: 0,
    score: 0,
  };
  await ref.set(topic);
  return topic;
}

// ---------------------------------------------------------------------------
// Replies (ivi_topics/{id}/replies)
// ---------------------------------------------------------------------------

/** Replies for a topic. */
export async function listReplies(topicId: string, sort: ReplySort = 'new'): Promise<Reply[]> {
  const col = db.collection(TOPICS).doc(topicId).collection(REPLIES);
  const snap =
    sort === 'top'
      ? await col.orderBy('score', 'desc').get()
      : await col.orderBy('createdAt', 'asc').get(); // "new" thread order: oldest first
  return snap.docs.map((d) => ({ ...(d.data() as Reply), id: d.id }));
}

/**
 * Create a reply and bump the parent topic's replyCount + lastActivityAt in
 * one transaction. Returns null when the topic doesn't exist (caller 404s).
 */
export async function createReply(
  topicId: string,
  input: { body: string; authorUid: string; authorName: string; authorPhotoUrl: string | null },
): Promise<Reply | null> {
  const topicRef = db.collection(TOPICS).doc(topicId);
  const replyRef = topicRef.collection(REPLIES).doc();
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const topicSnap = await tx.get(topicRef);
    if (!topicSnap.exists) return null;

    const reply: Reply = {
      id: replyRef.id,
      topicId,
      body: input.body,
      authorUid: input.authorUid,
      authorName: input.authorName,
      authorPhotoUrl: input.authorPhotoUrl,
      createdAt: now,
      upCount: 0,
      downCount: 0,
      score: 0,
    };
    tx.create(replyRef, reply);
    tx.update(topicRef, {
      replyCount: ((topicSnap.data() as Topic).replyCount ?? 0) + 1,
      lastActivityAt: now,
    });
    return reply;
  });
}

// ---------------------------------------------------------------------------
// Votes (ivi_votes) — doc id `${uid}_${targetId}`, one vote per user/target
// ---------------------------------------------------------------------------

/**
 * The toggling vote transaction (SPEC Data model):
 *  - no existing vote          → create it, bump the matching counter
 *  - same direction clicked    → remove the vote, decrement the counter
 *  - opposite direction        → flip: increment new counter, decrement old
 * Counter changes and the vote doc are committed atomically; `score` is kept
 * as upCount - downCount. Returns null when the target doc doesn't exist.
 */
export async function castVote(
  uid: string,
  targetType: VoteTargetType,
  targetId: string,
  topicId: string,
  value: VoteValue,
): Promise<VoteResult | null> {
  const voteRef = db.collection(VOTES).doc(`${uid}_${targetId}`);
  const targetRef =
    targetType === 'topic'
      ? db.collection(TOPICS).doc(topicId)
      : db.collection(TOPICS).doc(topicId).collection(REPLIES).doc(targetId);

  return db.runTransaction(async (tx) => {
    const [targetSnap, voteSnap] = await Promise.all([tx.get(targetRef), tx.get(voteRef)]);
    if (!targetSnap.exists) return null;

    const target = targetSnap.data() as { upCount?: number; downCount?: number };
    let up = target.upCount ?? 0;
    let down = target.downCount ?? 0;
    const previous: VoteValue | null = voteSnap.exists ? (voteSnap.data() as Vote).value : null;
    let myVote: VoteValue | null;

    if (previous === null) {
      // New vote.
      if (value === 1) up += 1;
      else down += 1;
      myVote = value;
      const vote: Vote = { uid, targetType, targetId, topicId, value, updatedAt: Date.now() };
      tx.set(voteRef, vote);
    } else if (previous === value) {
      // Same direction again → toggle off.
      if (value === 1) up = Math.max(0, up - 1);
      else down = Math.max(0, down - 1);
      myVote = null;
      tx.delete(voteRef);
    } else {
      // Opposite direction → flip.
      if (value === 1) {
        up += 1;
        down = Math.max(0, down - 1);
      } else {
        down += 1;
        up = Math.max(0, up - 1);
      }
      myVote = value;
      tx.update(voteRef, { value, updatedAt: Date.now() });
    }

    const result: VoteResult = { upCount: up, downCount: down, score: up - down, myVote };
    tx.update(targetRef, { upCount: up, downCount: down, score: up - down });
    return result;
  });
}

/**
 * Batch-fetch the caller's votes for a set of targets (for rendering ▲▼
 * state). Uses getAll by deterministic doc id — no `in`-query 10-item limit,
 * but we still chunk defensively. Returns a map: targetId → 1 | -1.
 */
export async function getVotesForUser(
  uid: string,
  targetIds: string[],
): Promise<Record<string, VoteValue>> {
  const out: Record<string, VoteValue> = {};
  if (targetIds.length === 0) return out;

  const refs = [...new Set(targetIds)].map((t) => db.collection(VOTES).doc(`${uid}_${t}`));
  const CHUNK = 100;
  for (let i = 0; i < refs.length; i += CHUNK) {
    const snaps = await db.getAll(...refs.slice(i, i + CHUNK));
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const vote = snap.data() as Vote;
      out[vote.targetId] = vote.value;
    }
  }
  return out;
}
