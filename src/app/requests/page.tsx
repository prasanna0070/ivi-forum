/**
 * /requests — feature requests for the community itself. Members post ideas,
 * vote for the ones they want, and see each one's status (set by admins on
 * the request's page). Most-wanted first by default.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Lightbulb, MessageSquare } from 'lucide-react';
import Avatar from '@/components/Avatar';
import FeatureStatusBadge from '@/components/forum/FeatureStatusBadge';
import TopicComposer from '@/components/forum/TopicComposer';
import VoteWidget from '@/components/forum/VoteWidget';
import { getVotesForUser, listTopics } from '@/lib/firestore';
import { FEATURE_STATUSES, FEATURE_STATUS_LABEL, featureStatus, isFeatureStatus } from '@/lib/features';
import { timeAgo } from '@/lib/format';
import { requireMember } from '@/lib/session';
import type { FeatureStatus } from '@/lib/types';

export const metadata: Metadata = { title: 'Feature requests' };

type Sort = 'top' | 'new';

function hrefFor(sort: Sort, status: FeatureStatus | 'all') {
  const q = new URLSearchParams();
  if (sort === 'new') q.set('sort', 'new');
  if (status !== 'all') q.set('status', status);
  const s = q.toString();
  return s ? `/requests?${s}` : '/requests';
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string | string[]; status?: string | string[] }>;
}) {
  const { user } = await requireMember();
  const sp = await searchParams;
  const sortParam = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const statusParam = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const sort: Sort = sortParam === 'new' ? 'new' : 'top';
  const statusFilter: FeatureStatus | 'all' = isFeatureStatus(statusParam) ? statusParam : 'all';

  const all = await listTopics(sort, 200, 'feature');
  const requests =
    statusFilter === 'all' ? all : all.filter((t) => featureStatus(t) === statusFilter);
  const myVotes = await getVotesForUser(
    user.id,
    requests.map((t) => t.id),
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-serif text-[2rem] font-medium leading-tight text-heading md:text-[2.5rem]">
            Feature requests
          </h1>
          <p className="mt-2 max-w-prose text-sm text-muted sm:text-base">
            What would make this community more useful to you? Request it, and vote for the
            ideas you want most. The most-wanted get built first, and you can follow each
            one&apos;s status here.
          </p>
        </div>
        <div className="shrink-0">
          <TopicComposer kind="feature" />
        </div>
      </div>

      <nav aria-label="Sort requests" className="mt-6 flex gap-6 border-b border-border md:gap-8">
        {(['top', 'new'] as Sort[]).map((key) => {
          const active = sort === key;
          return (
            <Link
              key={key}
              href={hrefFor(key, statusFilter)}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px inline-flex min-h-[44px] items-center border-b-[3px] px-1 text-sm font-semibold transition-colors ${
                active
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted hover:text-brand-light'
              }`}
            >
              {key === 'top' ? 'Most wanted' : 'Newest'}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter by status">
        {(['all', ...FEATURE_STATUSES] as (FeatureStatus | 'all')[]).map((key) => {
          const active = statusFilter === key;
          const count = key === 'all' ? all.length : all.filter((t) => featureStatus(t) === key).length;
          return (
            <Link
              key={key}
              href={hrefFor(sort, key)}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-input border px-3 text-sm font-medium transition-colors ${
                active
                  ? 'border-brand bg-brand text-white'
                  : 'border-border bg-white text-ink hover:border-brand-light'
              }`}
            >
              {key === 'all' ? 'All' : FEATURE_STATUS_LABEL[key]}
              <span className={active ? 'text-white/80' : 'text-muted'}>{count}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {requests.length === 0 ? (
          <div className="rounded-card border border-border bg-white p-10 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center border-2 border-brand text-brand">
              <Lightbulb strokeWidth={2} className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 font-serif text-xl font-medium text-heading">
              {statusFilter === 'all'
                ? 'No requests yet. Be the first to ask for something.'
                : `Nothing is ${FEATURE_STATUS_LABEL[statusFilter].toLowerCase()} right now.`}
            </p>
            <p className="mt-1 text-sm text-muted">
              A feature, a fix, or anything that would make this place more useful.
            </p>
          </div>
        ) : (
          requests.map((topic) => (
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
                    <FeatureStatusBadge status={featureStatus(topic)} />
                    <Link
                      href={`/requests/${topic.id}`}
                      className="font-semibold text-ink transition-colors group-hover:text-brand-light"
                    >
                      {topic.title}
                    </Link>
                  </div>
                  <div className="mt-2 flex min-w-0 items-center gap-x-1.5 text-xs text-muted">
                    <Avatar src={topic.authorPhotoUrl} name={topic.authorName} size={20} className="shrink-0" />
                    <span className="min-w-0 truncate font-medium text-ink">{topic.authorName}</span>
                    <span aria-hidden="true" className="shrink-0">·</span>
                    <span className="shrink-0 whitespace-nowrap">{timeAgo(topic.createdAt)}</span>
                    <span aria-hidden="true" className="shrink-0">·</span>
                    <span className="inline-flex shrink-0 items-center gap-1">
                      <MessageSquare strokeWidth={2} className="h-3.5 w-3.5" aria-hidden="true" />
                      {topic.replyCount}
                      <span className="sr-only">comments</span>
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
