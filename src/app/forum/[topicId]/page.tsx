/**
 * /forum/[topicId] — thread view: votable topic card, replies (New | Top),
 * reply composer. Server component; params/searchParams are Promises (Next 16).
 */
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import ReplyComposer from '@/components/forum/ReplyComposer';
import VoteWidget from '@/components/forum/VoteWidget';
import { getTopic, getVotesForUser, listReplies, type ReplySort } from '@/lib/firestore';
import { timeAgo } from '@/lib/format';
import { requireMember } from '@/lib/session';

function BackLink() {
  return (
    <Link
      href="/forum"
      className="inline-flex items-center gap-1 text-sm font-medium text-brand transition-colors hover:text-brand-light"
    >
      <span aria-hidden="true">←</span> Forum
    </Link>
  );
}

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  const { user } = await requireMember();

  const { topicId } = await params;
  const sp = await searchParams;
  const sortParam = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort: ReplySort = sortParam === 'top' ? 'top' : 'new';

  const topic = await getTopic(topicId);
  if (!topic) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <BackLink />
        <Card className="mt-6 p-10 text-center">
          <p className="font-display text-lg font-semibold text-ink">Topic not found</p>
          <p className="mt-1 text-sm text-neutral-500">
            It may have been removed, or the link is wrong.
          </p>
          <Link
            href="/forum"
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-light"
          >
            Back to the forum
          </Link>
        </Card>
      </main>
    );
  }

  const replies = await listReplies(topicId, sort);
  const myVotes = await getVotesForUser(user.id, [topicId, ...replies.map((r) => r.id)]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <BackLink />

      {/* Topic card */}
      <Card className="mt-4 p-6">
        <div className="flex gap-4">
          <VoteWidget
            targetType="topic"
            targetId={topic.id}
            topicId={topic.id}
            score={topic.score}
            myVote={myVotes[topic.id] ?? null}
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold text-ink">{topic.title}</h1>
            {topic.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {topic.tags.map((tag) => (
                  <Badge key={tag} variant="neutral">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
              <Avatar src={topic.authorPhotoUrl} name={topic.authorName} size={20} />
              <Link
                href={`/profile/${topic.authorUid}`}
                className="font-medium text-ink/70 transition-colors hover:text-brand"
              >
                {topic.authorName}
              </Link>
              <span aria-hidden="true">·</span>
              <span>{timeAgo(topic.createdAt)}</span>
            </div>
            {topic.body && (
              <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink/90">
                {topic.body}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Replies */}
      <div className="mt-8 flex items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold text-ink">
          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </h2>
        <nav aria-label="Sort replies" className="flex items-center gap-3 text-sm">
          <Link
            href={`/forum/${topicId}`}
            aria-current={sort === 'new' ? 'page' : undefined}
            className={
              sort === 'new'
                ? 'font-semibold text-brand underline underline-offset-4'
                : 'text-neutral-500 transition-colors hover:text-ink'
            }
          >
            New
          </Link>
          <Link
            href={`/forum/${topicId}?sort=top`}
            aria-current={sort === 'top' ? 'page' : undefined}
            className={
              sort === 'top'
                ? 'font-semibold text-brand underline underline-offset-4'
                : 'text-neutral-500 transition-colors hover:text-ink'
            }
          >
            Top
          </Link>
        </nav>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {replies.length === 0 ? (
          <p className="text-sm text-neutral-500">No replies yet — be the first to weigh in.</p>
        ) : (
          replies.map((reply) => (
            <Card key={reply.id} className="p-4">
              <div className="flex gap-3">
                <VoteWidget
                  compact
                  targetType="reply"
                  targetId={reply.id}
                  topicId={topicId}
                  score={reply.score}
                  myVote={myVotes[reply.id] ?? null}
                />
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink/90">
                    {reply.body}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                    <Avatar src={reply.authorPhotoUrl} name={reply.authorName} size={20} />
                    <Link
                      href={`/profile/${reply.authorUid}`}
                      className="font-medium text-ink/70 transition-colors hover:text-brand"
                    >
                      {reply.authorName}
                    </Link>
                    <span aria-hidden="true">·</span>
                    <span>{timeAgo(reply.createdAt)}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="mt-8">
        <ReplyComposer topicId={topicId} />
      </div>
    </main>
  );
}
