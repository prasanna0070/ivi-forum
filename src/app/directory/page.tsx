import type { Metadata } from 'next';
import DirectoryGrid from '@/components/directory/DirectoryGrid';
import { listMembers } from '@/lib/firestore';
import { requireMember } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Directory · iVi Forum',
  description: 'Member directory of the I-Venture @ ISB community — all four cohorts.',
};

export default async function DirectoryPage() {
  const { member } = await requireMember();
  const members = await listMembers();
  const firstName = member.name.split(' ')[0];

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-ink">Member directory</h1>
          <p className="mt-1 text-sm text-ink/60">
            Welcome back, {firstName} — founders and builders across all four iVi cohorts.
          </p>
        </header>

        <DirectoryGrid members={members} />
      </div>
    </main>
  );
}
