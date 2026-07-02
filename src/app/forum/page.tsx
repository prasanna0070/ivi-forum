/**
 * /forum — topic list with New | Top | Active tabs, vote columns and the
 * "Start a topic" composer. Server component; data via @/lib/firestore.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import TopicComposer from '@/components/forum/TopicComposer';
import VoteWidget from '@/components/forum/VoteWidget';
import { getVotesForUser, listTopics, type TopicSort } from '@/lib/firestore';
import { timeAgo } from '@/lib/format';
import { requireMember } from '@/lib/session';

export const metadata: Metadata = { title: 'Forum' };

const TABS: { key: TopicSort; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'top', label: 'Top' },
  { key: 'active', label: 'Active' },
];

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" />
    </svg>
  );
}

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  const { user } = await requireMember();

  const sp = await searchParams;
  const sortParam = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort: TopicSort = sortParam === 'top' || sortParam === 'active' ? sortParam : 'new';

  const topics = await listTopics(sort, 50);
  const myVotes = await getVotesForUser(
    user.id,
    topics.map((t) => t.id),
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-brand">Forum</h1>
        <TopicComposer />
      </div>

      <nav aria-label="Sort topics" className="mt-6 flex gap-6 border-b border-neutral-200">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === 'new' ? '/forum' : `/forum?sort=${tab.key}`}
            aria-current={sort === tab.key ? 'page' : undefined}
            className={`-mb-px border-b-2 pb-2 text-sm font-medium transition-colors ${
              sort === tab.key
                ? 'border-brand text-brand'
                : 'border-transparent text-neutral-500 hover:text-ink'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 flex flex-col gap-3">
        {topics.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20">
              <ChatIcon className="h-8 w-8 text-accent" />
            </div>
            <p className="mt-4 font-display text-lg font-semibold text-ink">
              No topics yet — start the first discussion.
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Ask a question, share a win, or float an idea for the cohort.
            </p>
          </Card>
        ) : (
          topics.map((topic) => (
            <Card key={topic.id} className="p-4">
              <div className="flex gap-4">
                <VoteWidget
                  targetType="topic"
                  targetId={topic.id}
                  topicId={topic.id}
                  score={topic.score}
                  myVote={myVotes[topic.id] ?? null}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={`/forum/${topic.id}`}
                      className="font-semibold text-ink transition-colors hover:text-brand"
                    >
                      {topic.title}
                    </Link>
                    {topic.tags.map((tag) => (
                      <Badge key={tag} variant="neutral">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                    <Avatar src={topic.authorPhotoUrl} name={topic.authorName} size={20} />
                    <span className="font-medium text-ink/70">{topic.authorName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{timeAgo(topic.createdAt)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <ChatIcon className="h-3.5 w-3.5" />
                      {topic.replyCount}
                      <span className="sr-only">replies</span>
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
