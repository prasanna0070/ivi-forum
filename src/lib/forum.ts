/**
 * Forum threading helpers — shared by the replies route (server) and the
 * reply tree UI (client). Pure functions only (no server deps), so both sides
 * can import them.
 */
import type { Reply } from '@/lib/types';

/** Reply ordering for the top level (mirrors firestore's ReplySort, kept local
 * so this pure module stays free of server-only imports). */
type ReplySort = 'new' | 'top';

/**
 * Max nesting depth for the reply TREE indentation. A reply deeper than this is
 * still attached to its real parent, but stops indenting further (Reddit-style),
 * so the thread never marches off the right edge on mobile. `depth` is clamped
 * to this on the server at create time.
 */
export const REPLY_MAX_DEPTH = 4;

/** A reply plus its nested child replies. */
export interface ReplyNode extends Reply {
  children: ReplyNode[];
}

/**
 * Build a reply tree from a flat list. Top-level nodes (parentId == null, or a
 * dangling parent) are ordered by `sort` (new = oldest-first thread order; top =
 * score desc); child replies are always chronological (oldest-first) under their
 * parent so a conversation reads top-to-bottom.
 */
export function buildReplyTree(replies: Reply[], sort: ReplySort): ReplyNode[] {
  const byId = new Map<string, ReplyNode>();
  for (const r of replies) byId.set(r.id, { ...r, children: [] });

  const roots: ReplyNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  for (const node of byId.values()) {
    node.children.sort((a, b) => a.createdAt - b.createdAt);
  }
  roots.sort((a, b) =>
    sort === 'top' ? b.score - a.score || a.createdAt - b.createdAt : a.createdAt - b.createdAt,
  );
  return roots;
}
