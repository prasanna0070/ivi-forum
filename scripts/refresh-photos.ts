/**
 * Re-pull member profile photos from LinkedIn and keep our own copy.
 *
 * Older profiles stored LinkedIn's signed photo URL, which expires after about
 * five weeks, so those members fall back to initials in the directory. For
 * every member whose photo is missing or is a link (not our copy), this re-scrapes their
 * LinkedIn profile (Apify, ~$0.01 each), mirrors the fresh picture into the
 * uploads bucket (avatars/<uid>/...), and updates ONLY photoUrl. Nothing else
 * on the profile is touched. Members whose photo is already a stored copy are
 * skipped.
 *
 * Run (dry run lists what it would do; add --apply to write):
 *   APIFY_API_TOKEN=$(gcloud secrets versions access latest --secret=ivi-forum-apify-token) \
 *   UPLOADS_BUCKET=ivi-forum-uploads-891711670395 GCP_PROJECT=project-55741ec9-449d-403c-9e5 \
 *   npx tsx scripts/refresh-photos.ts [--apply]
 */
import { db, upsertMember } from "@/lib/firestore";
import { scrapeLinkedInProfile } from "@/lib/linkedin";
import { mirrorRemoteAvatar } from "@/lib/storage";
import type { MemberProfile } from "@/lib/types";

const apply = process.argv.includes("--apply");

async function main() {
  const snap = await db.collection("ivi_users").get();
  let fixed = 0;
  let failed = 0;
  for (const doc of snap.docs) {
    const m = doc.data() as MemberProfile;
    // Only our own stored copies count; any link (even one that still loads)
    // is replaced, because links are never shown.
    if (m.photoUrl?.startsWith("avatars/")) continue;
    if (!m.linkedinUrl) {
      console.log(`skip  ${m.name}: no LinkedIn URL`);
      continue;
    }
    if (!apply) {
      console.log(`would ${m.name}: ${m.photoUrl ? "link, not a stored copy" : "no photo"}`);
      continue;
    }
    const scraped = await scrapeLinkedInProfile(m.linkedinUrl);
    const fresh = scraped.ok ? scraped.profile?.profilePictureUrl : null;
    if (!fresh) {
      console.log(`FAIL  ${m.name}: ${scraped.ok ? "LinkedIn has no photo" : scraped.error}`);
      failed += 1;
      continue;
    }
    const stored = await mirrorRemoteAvatar(doc.id, fresh);
    if (!stored) {
      console.log(`FAIL  ${m.name}: could not copy the photo`);
      failed += 1;
      continue;
    }
    await upsertMember(doc.id, { photoUrl: stored });
    console.log(`ok    ${m.name}`);
    fixed += 1;
  }
  console.log(apply ? `\nfixed ${fixed}, failed ${failed}` : "\n(dry run; add --apply)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
