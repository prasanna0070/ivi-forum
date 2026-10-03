/**
 * /privacy — what the forum stores and why. Public (no sign-in), and linked
 * from Google's sign-in consent screen.
 */
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

const sections: { heading: string; body: string[] }[] = [
  {
    heading: "What we collect",
    body: [
      "Your Google account's name, email address and profile photo, when you sign in with Google.",
      "The ISB email address you verify (student @isb.edu or alumni @ivi.isb.edu), to confirm you are part of I-Venture @ ISB.",
      "Your public LinkedIn profile, only if you paste its URL during onboarding, and anything you edit on your profile.",
      "The topics, replies, votes and images you post.",
    ],
  },
  {
    heading: "How we use it",
    body: [
      "To let you sign in, to show your profile in the member directory, and to run the forum.",
      "To email you a verification code, and notifications you can switch off on your profile or with the unsubscribe link in every email.",
      "We do not sell your data or use it for advertising. Only signed-in members can see the directory and the forum.",
    ],
  },
  {
    heading: "Where it lives",
    body: [
      "Data is stored on Google Cloud (Firestore and Cloud Storage). Email is sent through Gmail. LinkedIn profiles are fetched through Apify.",
    ],
  },
  {
    heading: "Your choices",
    body: [
      "You can edit your profile at any time. To delete your account and everything you posted, email isbivico4@gmail.com from the address on your account.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl py-6">
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
        iVi Forum
      </p>
      <h1 className="mt-2 font-serif text-3xl font-medium text-heading">Privacy</h1>
      <p className="mt-4 text-base leading-relaxed text-ink">
        The iVi Forum is a community-built member directory and discussion forum
        for I-Venture @ ISB founders. It is not an official ISB service.
      </p>
      {sections.map((s) => (
        <section key={s.heading} className="mt-8">
          <h2 className="text-lg font-semibold text-heading">{s.heading}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-ink">
            {s.body.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
