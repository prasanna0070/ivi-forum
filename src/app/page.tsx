/**
 * Landing page — signed-in users bounce straight into the app
 * (/directory, or /onboarding until the profile is complete).
 */
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMember } from "@/lib/firestore";
import AuthCard from "@/components/AuthCard";
import Card from "@/components/Card";

const FEATURES: { title: string; description: string; icon: React.ReactNode }[] = [
  {
    title: "Directory",
    description: "Find founders across all four cohorts — searchable by name, startup, and skills.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM21 20v-1a4 4 0 0 0-3-3.87M15 3.13A4 4 0 0 1 15 11" />
      </svg>
    ),
  },
  {
    title: "Forum",
    description: "Ask, share, and vote — one discussion room for the whole iVi community.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12c0 4.14-4.03 7.5-9 7.5-1.06 0-2.07-.15-3-.43L3 21l1.55-3.87C3.58 15.83 3 14 3 12c0-4.14 4.03-7.5 9-7.5s9 3.36 9 7.5Z" />
      </svg>
    ),
  },
  {
    title: "LinkedIn-powered profiles",
    description: "Paste your LinkedIn URL and your member profile builds itself.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7Z" />
      </svg>
    ),
  },
];

export default async function Home() {
  const session = await auth();
  if (session?.user?.id) {
    const member = await getMember(session.user.id).catch(() => null);
    redirect(member?.profileComplete ? "/directory" : "/onboarding");
  }

  return (
    <div className="flex flex-col items-center gap-10 py-8 sm:py-14">
      <Image
        src="/brand/ivi-logo.png"
        alt="I-Venture @ ISB"
        width={299}
        height={60}
        priority
        className="h-12 w-auto sm:h-14"
      />

      <div className="max-w-2xl text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-brand sm:text-5xl">
          Every cohort. One room.
        </h1>
        <p className="mt-4 text-lg text-ink/70">
          The member directory and forum for I-Venture @ ISB founders — built by
          the community, for the community.
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title} className="p-5">
            <div className="text-brand">{f.icon}</div>
            <h2 className="mt-3 text-sm font-semibold text-ink">{f.title}</h2>
            <p className="mt-1 text-sm text-ink/60">{f.description}</p>
          </Card>
        ))}
      </div>

      <AuthCard />
    </div>
  );
}
