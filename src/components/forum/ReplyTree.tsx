'use client';

/**
 * ReplyTree — renders threaded replies as an indented tree. Each node has its
 * own vote column, images, author line, and a "Reply" toggle that opens an
 * inline nested composer. Indentation stops growing past REPLY_MAX_DEPTH so the
 * thread stays readable on mobile.
 */
import Link from 'next/link';
import { useState } from 'react';
import { Reply as ReplyIcon } from 'lucide-react';
import Avatar from '@/components/Avatar';
import VoteWidget from './VoteWidget';
import PostImages from './PostImages';
import ReplyComposer from './ReplyComposer';
import { REPLY_MAX_DEPTH, type ReplyNode } from '@/lib/forum';
import { timeAgo } from '@/lib/format';
import type { VoteValue } from '@/lib/types';

function Node({
  node,
  topicId,
  myVotes,
}: {
  node: ReplyNode;
  topicId: string;
  myVotes: Record<string, VoteValue>;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <div>
      <div className="rounded-card border border-border bg-white p-4">
        <div className="flex gap-3">
          <VoteWidget
            compact
            targetType="reply"
            targetId={node.id}
            topicId={topicId}
            score={node.score}
            myVote={myVotes[node.id] ?? null}
          />
          <div className="min-w-0 flex-1">
            {node.body && (
              <p className="whitespace-pre-line text-base leading-[1.6] text-ink">{node.body}</p>
            )}
            <PostImages images={node.images} />
            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
              <Avatar src={node.authorPhotoUrl} name={node.authorName} size={20} className="shrink-0" />
              <Link
                href={`/profile/${node.authorUid}`}
                className="min-w-0 truncate font-medium text-ink transition-colors hover:text-brand-light"
              >
                {node.authorName}
              </Link>
              <span aria-hidden="true" className="shrink-0">·</span>
              <span className="shrink-0 whitespace-nowrap">{timeAgo(node.createdAt)}</span>
              <span aria-hidden="true" className="shrink-0">·</span>
              <button
                type="button"
                onClick={() => setReplying((v) => !v)}
                aria-expanded={replying}
                className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand transition-colors hover:text-brand-light"
              >
                <ReplyIcon strokeWidth={2} className="h-3.5 w-3.5" aria-hidden="true" />
                Reply
              </button>
            </div>

            {replying && (
              <div className="mt-3">
                <ReplyComposer
                  topicId={topicId}
                  parentId={node.id}
                  onDone={() => setReplying(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {node.children.length > 0 && (
        <div
          className={
            node.depth < REPLY_MAX_DEPTH
              ? 'mt-3 space-y-3 border-l-2 border-border pl-3 sm:pl-4'
              : 'mt-3 space-y-3'
          }
        >
          {node.children.map((child) => (
            <Node key={child.id} node={child} topicId={topicId} myVotes={myVotes} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReplyTree({
  roots,
  topicId,
  myVotes,
}: {
  roots: ReplyNode[];
  topicId: string;
  myVotes: Record<string, VoteValue>;
}) {
  return (
    <div className="flex flex-col gap-3">
      {roots.map((node) => (
        <Node key={node.id} node={node} topicId={topicId} myVotes={myVotes} />
      ))}
    </div>
  );
}
