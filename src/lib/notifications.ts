/**
 * Notification fan-out for forum activity — new topics and replies.
 *
 * Two layers, deliberately separated:
 *   1. Pure recipient resolvers (resolveTopicRecipients / resolveReplyRecipients)
 *      — no I/O, unit-testable, encode ALL the audience rules: exclude the
 *      actor, exclude opted-out members (emailNotifications === false; absent
 *      means opted IN), exclude members without an email, and collapse to ONE
 *      email per member with priority mention > reply-to-comment >
 *      reply-to-post > interest.
 *   2. Async fan-out (notifyTopicCreated / notifyReplyCreated) — fetches
 *      members (and the topic/parent for replies), renders templates from
 *      @/lib/emailTemplates, and sends via sendEmails. These NEVER throw:
 *      posting must never fail because email did.
 *
 * Interest notifications ("a new post matched your tags") apply to topics
 * only — replies never fan out to tag followers.
 */
import { emailConfigured, sendEmails, type OutgoingEmail } from "@/lib/email";
import {
  mentionEmail,
  newPostEmail,
  previewText,
  replyEmail,
  type EmailContent,
} from "@/lib/emailTemplates";
import { getReply, getTopic, listMembers } from "@/lib/firestore";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import type { MemberProfile, Reply, Topic } from "@/lib/types";

// ---------------------------------------------------------------------------
// Pure recipient resolution (no I/O)
// ---------------------------------------------------------------------------

/** Why a member is being emailed, in priority order (highest first). */
export type NotificationKind = "mention" | "reply-to-comment" | "reply-to-post" | "interest";

export interface Recipient {
  member: MemberProfile;
  kind: NotificationKind;
  /** For kind "interest": the member's interestTags ∩ the topic's tags. */
  matchedTags?: string[];
}

/**
 * Can this member receive notification emails about someone else's action?
 * Absent `emailNotifications` means opted IN (members predate the field).
 */
function eligible(member: MemberProfile, actorUid: string): boolean {
  if (!member || !member.uid || member.uid === actorUid) return false;
  if (member.emailNotifications === false) return false;
  if (!member.email) return false;
  return true;
}

/**
 * Audience for a brand-new topic: @-mentioned members plus members whose
 * interestTags overlap the topic's tags. One Recipient per member — a mention
 * wins over an interest match.
 */
export function resolveTopicRecipients(topic: Topic, members: MemberProfile[]): Recipient[] {
  const mentioned = new Set(topic.mentionUids ?? []);
  const topicTags = topic.tags ?? [];
  const out: Recipient[] = [];

  for (const member of members ?? []) {
    if (!eligible(member, topic.authorUid)) continue;

    if (mentioned.has(member.uid)) {
      out.push({ member, kind: "mention" });
      continue;
    }
    if (topicTags.length === 0) continue;
    const interests = new Set(member.interestTags ?? []);
    const matchedTags = topicTags.filter((tag) => interests.has(tag));
    if (matchedTags.length > 0) {
      out.push({ member, kind: "interest", matchedTags });
    }
  }
  return out;
}

/**
 * Audience for a new reply: @-mentioned members, the parent reply's author
 * ("someone replied to your reply"), and the topic's author ("someone replied
 * to your post"). NO interest notifications for replies. One Recipient per
 * member with priority mention > reply-to-comment > reply-to-post — so a
 * member who is both the parent author and the topic author gets exactly one
 * "reply to your reply" email.
 */
export function resolveReplyRecipients(i: {
  topic: Topic;
  reply: Reply;
  parentReply: Reply | null;
  members: MemberProfile[];
}): Recipient[] {
  const { topic, reply, parentReply, members } = i;
  const mentioned = new Set(reply.mentionUids ?? []);
  const out: Recipient[] = [];

  for (const member of members ?? []) {
    if (!eligible(member, reply.authorUid)) continue;

    if (mentioned.has(member.uid)) {
      out.push({ member, kind: "mention" });
    } else if (parentReply && member.uid === parentReply.authorUid) {
      out.push({ member, kind: "reply-to-comment" });
    } else if (member.uid === topic.authorUid) {
      out.push({ member, kind: "reply-to-post" });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fan-out (I/O) — never throws
// ---------------------------------------------------------------------------

/**
 * Wrap rendered content into an OutgoingEmail with the RFC 8058 one-click
 * unsubscribe header pair. BOTH headers are required: without
 * List-Unsubscribe-Post, mail clients (Gmail/Yahoo) never show the native
 * Unsubscribe button nor POST to the URL — only the footer link would work.
 */
function toOutgoing(member: MemberProfile, unsub: string, content: EmailContent): OutgoingEmail {
  return {
    to: member.email,
    ...content,
    headers: {
      "List-Unsubscribe": `<${unsub}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

/**
 * Email everyone who should hear about a freshly created topic. Never throws —
 * a notification failure must never fail the post itself.
 */
export async function notifyTopicCreated(topic: Topic): Promise<void> {
  try {
    if (!emailConfigured) return;
    if ((topic.tags ?? []).length === 0 && (topic.mentionUids ?? []).length === 0) return;

    const members = await listMembers();
    const recipients = resolveTopicRecipients(topic, members);
    if (recipients.length === 0) return;

    const bodyPreview = previewText(topic.body ?? "");
    const messages = recipients.map(({ member, kind, matchedTags }) => {
      const unsub = unsubscribeUrl(member.uid);
      const common = {
        recipientName: member.name,
        actorName: topic.authorName,
        topicTitle: topic.title,
        topicId: topic.id,
        bodyPreview,
        unsubscribeUrl: unsub,
      };
      const content =
        kind === "mention"
          ? mentionEmail({ ...common, where: "post" })
          : newPostEmail({
              ...common,
              matchedTags: matchedTags ?? [],
              // Lets the template tell an image-only post apart from a legal
              // title-only one (no false "Shared an image." for the latter).
              hasImages: (topic.images ?? []).length > 0,
            });
      return toOutgoing(member, unsub, content);
    });
    await sendEmails(messages);
  } catch (err) {
    console.error(`[notifications] topic ${topic?.id} fan-out failed:`, err);
  }
}

/**
 * Email everyone who should hear about a freshly created reply (mentions, the
 * parent reply's author, the topic's author). Never throws.
 */
export async function notifyReplyCreated(topicId: string, reply: Reply): Promise<void> {
  try {
    if (!emailConfigured) return;

    const [topic, parentReply, members] = await Promise.all([
      getTopic(topicId),
      reply.parentId ? getReply(topicId, reply.parentId) : Promise.resolve<Reply | null>(null),
      listMembers(),
    ]);
    if (!topic) return;

    const recipients = resolveReplyRecipients({ topic, reply, parentReply, members });
    if (recipients.length === 0) return;

    const bodyPreview = previewText(reply.body ?? "");
    const messages = recipients.map(({ member, kind }) => {
      const unsub = unsubscribeUrl(member.uid);
      const common = {
        recipientName: member.name,
        actorName: reply.authorName,
        topicTitle: topic.title,
        topicId: topic.id,
        bodyPreview,
        unsubscribeUrl: unsub,
      };
      const content =
        kind === "mention"
          ? mentionEmail({ ...common, where: "reply" })
          : replyEmail({ ...common, kind: kind === "reply-to-comment" ? "comment" : "post" });
      return toOutgoing(member, unsub, content);
    });
    await sendEmails(messages);
  } catch (err) {
    console.error(`[notifications] reply ${reply?.id} on topic ${topicId} fan-out failed:`, err);
  }
}
