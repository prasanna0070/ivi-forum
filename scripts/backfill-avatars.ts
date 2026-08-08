/**
 * One-off maintenance: mirror members' remote profile photos into the uploads
 * bucket and repoint `photoUrl` at the stored object.
 *
 * WHY: LinkedIn profile pictures are signed, expiring URLs (`…?e=<unix>&t=<sig>`,
 * ~5 weeks of life). Members onboarded before the mirror-on-save fix still have
 * a raw licdn URL in Firestore, so their avatar silently 403s into an initials
 * circle once that expiry passes. This copies the ones that still resolve.
 *
 * Already-expired photos CANNOT be recovered here — licdn returns 403 and the
 * bytes are simply gone. Those members need a re-scrape or to upload a photo.
 *
 * Usage (from the repo root, with ADC that can read Firestore + write the bucket):
 *   GCP_PROJECT=<project> UPLOADS_BUCKET=<bucket> npx tsx scripts/backfill-avatars.ts
 *   GCP_PROJECT=<project> UPLOADS_BUCKET=<bucket> npx tsx scripts/backfill-avatars.ts --apply
 *
 * Dry-run by default: prints what it would do and changes nothing. `--apply`
 * writes a timestamped JSON backup of every (uid → old photoUrl) it is about to
 * overwrite, then performs the update. Safe to re-run; already-mirrored members
 * are skipped.
 */
import { writeFileSync } from 'node:fs';
import { Firestore } from '@google-cloud/firestore';
import { mirrorRemoteAvatar } from '../src/lib/storage';
import { isStoredAvatarPath } from '../src/lib/images';

const APPLY = process.argv.includes('--apply');
const PROJECT = process.env.GCP_PROJECT || undefined;

if (!process.env.UPLOADS_BUCKET) {
  console.error('UPLOADS_BUCKET is required.');
  process.exit(1);
}

async function main() {
  const db = new Firestore({ projectId: PROJECT });
  const snap = await db.collection('ivi_users').get();

  const todo: { uid: string; name: string; photoUrl: string }[] = [];
  let alreadyStored = 0;
  let noPhoto = 0;

  snap.forEach((doc) => {
    const v = doc.data() as { name?: string; photoUrl?: string | null };
    const photoUrl = v.photoUrl ?? null;
    if (!photoUrl) return void noPhoto++;
    if (isStoredAvatarPath(photoUrl)) return void alreadyStored++;
    todo.push({ uid: doc.id, name: v.name ?? '(unnamed)', photoUrl });
  });

  console.log(
    `${snap.size} members — ${todo.length} to mirror, ${alreadyStored} already stored, ${noPhoto} without a photo.`,
  );
  console.log(APPLY ? 'Mode: APPLY\n' : 'Mode: DRY RUN (pass --apply to write)\n');

  const backup: Record<string, string> = {};
  const mirrored: { uid: string; name: string; path: string }[] = [];
  const failed: { uid: string; name: string }[] = [];

  for (const m of todo) {
    const path = await mirrorRemoteAvatar(m.uid, m.photoUrl);
    if (path) {
      mirrored.push({ uid: m.uid, name: m.name, path });
      backup[m.uid] = m.photoUrl;
      console.log(`  OK   ${m.name} → ${path}`);
    } else {
      failed.push({ uid: m.uid, name: m.name });
      console.log(`  DEAD ${m.name} — source no longer fetchable, photo unrecoverable`);
    }
  }

  if (!APPLY) {
    console.log(`\nDry run complete. Would update ${mirrored.length} member(s).`);
    if (failed.length) {
      console.log(`${failed.length} member(s) have an unrecoverable photo (re-scrape or upload).`);
    }
    return;
  }

  if (mirrored.length === 0) {
    console.log('\nNothing to write.');
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `avatar-backfill-backup-${stamp}.json`;
  writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`\nBackup of previous photoUrl values → ${backupPath}`);

  const batch = db.batch();
  for (const m of mirrored) {
    batch.update(db.collection('ivi_users').doc(m.uid), {
      photoUrl: m.path,
      updatedAt: Date.now(),
    });
  }
  await batch.commit();
  console.log(`Updated ${mirrored.length} member(s).`);
  if (failed.length) {
    console.log(`${failed.length} member(s) still have an unrecoverable photo.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
