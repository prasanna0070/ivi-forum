/**
 * /forum — topic list with New | Top | Active tabs, vote columns and the
 * "Start a topic" composer. Server component; data via @/lib/firestore.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import Avatar from '@/components/Avatar';
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
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-[2rem] font-semibold leading-tight text-heading md:text-[2.5rem]">
          Forum
        </h1>
        <TopicComposer />
      </div>

      <nav aria-label="Sort topics" className="mt-6 flex gap-6 border-b border-border md:gap-8">
        {TABS.map((tab) => {
          const active = sort === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.key === 'new' ? '/forum' : `/forum?sort=${tab.key}`}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px inline-flex min-h-[44px] items-center border-b-[3px] px-1 text-sm font-semibold transition-colors ${
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

      <div className="mt-6 flex flex-col gap-3">
        {topics.length === 0 ? (
          <div className="rounded-card border border-border bg-white p-10 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center border-2 border-brand text-brand">
              <MessageSquare strokeWidth={2} className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 font-serif text-xl font-semibold text-heading">
              No topics yet — start the first discussion.
            </p>
            <p className="mt-1 text-sm text-muted">
              Ask a question, share a win, or float an idea for the cohort.
            </p>
          </div>
        ) : (
          topics.map((topic) => (
            <div
              key={topic.id}
              className="group rounded-card border border-border bg-white p-4 transition-colors hover:border-brand-light"
            >
              <div className="flex gap-3 sm:gap-4">
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
                      className="font-semibold text-ink transition-colors group-hover:text-brand-light"
                    >
                      {topic.title}
                    </Link>
                    {topic.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-input border border-border bg-white px-2 py-0.5 text-xs font-medium text-brand"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex min-w-0 items-center gap-x-1.5 text-xs text-muted">
                    <Avatar
                      src={topic.authorPhotoUrl}
                      name={topic.authorName}
                      size={20}
                      className="shrink-0"
                    />
                    <span className="min-w-0 truncate font-medium text-ink">{topic.authorName}</span>
                    <span aria-hidden="true" className="shrink-0">
                      ·
                    </span>
                    <span className="shrink-0 whitespace-nowrap">{timeAgo(topic.createdAt)}</span>
                    <span aria-hidden="true" className="shrink-0">
                      ·
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1">
                      <MessageSquare strokeWidth={2} className="h-3.5 w-3.5" aria-hidden="true" />
                      {topic.replyCount}
                      <span className="sr-only">replies</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
