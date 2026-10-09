/**
 * /requests/[id] — one feature request: votes, status, comments (TopicThread).
 * Admins (ADMIN_UIDS) can change the status here.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import TopicThread from '@/components/forum/TopicThread';
import { isAdmin } from '@/lib/admin';
import { getTopic, type ReplySort } from '@/lib/firestore';
import { isFeatureRequest } from '@/lib/features';
import { requireMember } from '@/lib/session';

export const metadata: Metadata = { title: 'Feature request' };

export default async function FeatureRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  const { user } = await requireMember();
  const { id } = await params;
  const sp = await searchParams;
  const sortParam = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort: ReplySort = sortParam === 'top' ? 'top' : 'new';

  const topic = await getTopic(id);
  if (topic && !isFeatureRequest(topic)) redirect(`/forum/${encodeURIComponent(id)}`);
  return (
    <TopicThread
      topic={topic}
      topicId={id}
      sort={sort}
      userId={user.id}
      isAdmin={isAdmin(user.id)}
      basePath="/requests"
      backLabel="Feature requests"
    />
  );
}
