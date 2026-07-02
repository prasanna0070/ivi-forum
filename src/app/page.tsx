/**
 * Landing page — signed-in users bounce straight into the app
 * (/directory, or /onboarding until the profile is complete).
 *
 * Full-bleed banded layout (navy hero → surface features → white join).
 * The `-mx-4 sm:-mx-6 -my-8` wrapper cancels the shared <main> padding so the
 * bands span the container edge-to-edge without ever exceeding its width — no
 * horizontal overflow at any viewport.
 */
import Image from "next/image";
import { redirect } from "next/navigation";
import { Users, MessageSquare, Zap, ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { getMember } from "@/lib/firestore";
import AuthCard from "@/components/AuthCard";
import Card from "@/components/Card";

const FEATURES: {
  title: string;
  description: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}[] = [
  {
    title: "Directory",
    description:
      "Find founders across all four cohorts — searchable by name, startup, and skills.",
    Icon: Users,
  },
  {
    title: "Forum",
    description:
      "Ask, share, and vote — one discussion room for the whole iVi community.",
    Icon: MessageSquare,
  },
  {
    title: "LinkedIn-powered profiles",
    description: "Paste your LinkedIn URL and your member profile builds itself.",
    Icon: Zap,
  },
];

export default async function Home() {
  const session = await auth();
  if (session?.user?.id) {
    const member = await getMember(session.user.id).catch(() => null);
    redirect(member?.profileComplete ? "/directory" : "/onboarding");
  }

  return (
    <div className="-mx-4 -my-8 flex flex-col sm:-mx-6">
      {/* ── hero (navy band) ── */}
      <section className="bg-gradient-to-b from-brand to-brand-dark text-white">
        <div className="px-safe mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6 md:py-24">
          <Image
            src="/brand/ivi-logo-white.png"
            alt="I-Venture @ ISB"
            width={1920}
            height={389}
            priority
            className="h-10 w-auto sm:h-12"
          />
          <p className="mt-8 text-[13px] font-semibold uppercase tracking-[0.08em] text-white/70">
            The I-Venture @ ISB community
          </p>
          <h1 className="mt-3 font-serif text-[40px] font-semibold leading-[1.1] text-white md:text-display">
            Every cohort. One room.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 md:text-lg">
            The member directory and forum for I-Venture @ ISB founders — built by
            the community, for the community.
          </p>
          <a
            href="#join"
            className="group mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 border border-white bg-white px-6 text-base font-semibold text-brand transition-colors hover:border-mint hover:bg-mint"
          >
            Join the community
            <ArrowRight
              size={20}
              strokeWidth={2}
              className="transition-transform duration-200 group-hover:translate-x-2"
            />
          </a>
        </div>
      </section>

      {/* ── features (surface band) ── */}
      <section className="bg-surface">
        <div className="px-safe mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
              What&rsquo;s inside
            </p>
            <h2 className="mt-2 text-[24px] font-semibold leading-tight md:text-h2">
              Everything the community runs on
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink">
              One place to find every founder and keep the conversation going —
              across all four cohorts.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {FEATURES.map(({ title, description, Icon }) => (
              <Card key={title} className="p-6">
                <Icon size={24} strokeWidth={2} className="text-brand" />
                <h3 className="mt-4 font-serif text-xl font-semibold text-heading">
                  {title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink">
                  {description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── join (white band) ── */}
      <section id="join" className="scroll-mt-24 bg-white">
        <div className="px-safe mx-auto flex max-w-6xl flex-col items-center px-4 py-16 sm:px-6 md:py-20">
          <div className="mb-8 max-w-xl text-center">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-brand-light">
              Join
            </p>
            <h2 className="mt-2 text-[24px] font-semibold leading-tight md:text-h2">
              Get in the room
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink">
              Sign in with your account, or create one in seconds — your profile
              builds itself from LinkedIn.
            </p>
          </div>
          <AuthCard />
        </div>
      </section>
    </div>
  );
}
