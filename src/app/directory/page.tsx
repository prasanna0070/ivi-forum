import type { Metadata } from 'next';
import DirectoryGrid from '@/components/directory/DirectoryGrid';
import { listMembers } from '@/lib/firestore';
import { requireMember } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Directory · iVi Forum',
  description: 'Member directory of the I-Venture @ ISB community — all four cohorts.',
};

export default async function DirectoryPage() {
  // Run the auth/member check and the members query concurrently — they don't
  // depend on each other, so this saves a Firestore round-trip on every load.
  const [{ member }, members] = await Promise.all([
    requireMember(),
    listMembers(),
  ]);
  const firstName = member.name.split(' ')[0];

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6">
          <h1 className="font-serif text-3xl font-medium text-heading sm:text-4xl">
            Member directory
          </h1>
          <p className="mt-2 text-sm text-muted sm:text-base">
            Welcome back, {firstName} — founders and builders across all four iVi cohorts.
          </p>
        </header>

        <DirectoryGrid members={members} />
      </div>
    </main>
  );
}
