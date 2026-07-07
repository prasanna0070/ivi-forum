/**
 * /forum/[topicId] — thread view: votable topic card, replies (New | Top),
 * reply composer. Server component; params/searchParams are Promises (Next 16).
 */
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import ReplyComposer from '@/components/forum/ReplyComposer';
import ReplyTree from '@/components/forum/ReplyTree';
import PostImages from '@/components/forum/PostImages';
import VoteWidget from '@/components/forum/VoteWidget';
import { getTopic, getVotesForUser, listReplies, type ReplySort } from '@/lib/firestore';
import { buildReplyTree } from '@/lib/forum';
import { tagLabel } from '@/components/forum/tags';
import { timeAgo } from '@/lib/format';
import { requireMember } from '@/lib/session';
import IviArrow from '@/components/IviArrow';

const REPLY_TABS: { key: ReplySort; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'top', label: 'Top' },
];

function BackLink() {
  return (
    <Link
      href="/forum"
      className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-light"
    >
      <IviArrow dir="left"
        strokeWidth={2}
        className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1"
        aria-hidden="true"
      />
      Forum
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
      <div className="mx-auto w-full max-w-3xl">
        <BackLink />
        <div className="mt-6 rounded-card border border-border bg-white p-10 text-center">
          <p className="font-serif text-xl font-medium text-heading">Topic not found</p>
          <p className="mt-1 text-sm text-muted">
            It may have been removed, or the link is wrong.
          </p>
          <Link
            href="/forum"
            className="group mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-brand bg-brand px-6 py-3 text-base font-semibold text-white transition-all hover:bg-brand-light active:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heading/40"
          >
            <IviArrow dir="left"
              strokeWidth={2}
              className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-1"
              aria-hidden="true"
            />
            Back to the forum
          </Link>
        </div>
      </div>
    );
  }

  const replies = await listReplies(topicId, sort);
  const roots = buildReplyTree(replies, sort);
  const myVotes = await getVotesForUser(user.id, [topicId, ...replies.map((r) => r.id)]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <BackLink />

      {/* Topic card */}
      <div className="mt-4 rounded-card border border-border bg-white p-5 md:p-6">
        <div className="flex gap-3 sm:gap-4">
          <VoteWidget
            targetType="topic"
            targetId={topic.id}
            topicId={topic.id}
            score={topic.score}
            myVote={myVotes[topic.id] ?? null}
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-[1.75rem] font-medium leading-tight text-heading md:text-[2rem]">
              {topic.title}
            </h1>
            {topic.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {topic.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-input border border-border bg-white px-2 py-0.5 text-xs font-medium text-brand"
                  >
                    {tagLabel(tag)}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3 flex min-w-0 items-center gap-x-1.5 text-xs text-muted">
              <Avatar
                src={topic.authorPhotoUrl}
                name={topic.authorName}
                size={20}
                className="shrink-0"
              />
              <Link
                href={`/profile/${topic.authorUid}`}
                className="min-w-0 truncate font-medium text-ink transition-colors hover:text-brand-light"
              >
                {topic.authorName}
              </Link>
              <span aria-hidden="true" className="shrink-0">
                ·
              </span>
              <span className="shrink-0 whitespace-nowrap">{timeAgo(topic.createdAt)}</span>
            </div>
            {topic.body && (
              <p className="mt-4 whitespace-pre-line text-base leading-[1.6] text-ink">
                {topic.body}
              </p>
            )}
            <PostImages images={topic.images} />
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="mt-8 flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl font-medium text-heading md:text-2xl">
          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </h2>
        <nav aria-label="Sort replies" className="flex items-center gap-4">
          {REPLY_TABS.map((tab) => {
            const href =
              tab.key === 'new' ? `/forum/${topicId}` : `/forum/${topicId}?sort=${tab.key}`;
            const active = sort === tab.key;
            return (
              <Link
                key={tab.key}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-[44px] items-center border-b-[3px] px-0.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'border-brand text-brand'
                    : 'border-transparent text-muted hover:text-brand-light'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-4">
        {roots.length === 0 ? (
          <p className="text-sm text-muted">No replies yet — be the first to weigh in.</p>
        ) : (
          <ReplyTree roots={roots} topicId={topicId} myVotes={myVotes} />
        )}
      </div>

      {/* Top-level composer */}
      <div className="mt-8">
        <ReplyComposer topicId={topicId} />
      </div>
    </div>
  );
}
