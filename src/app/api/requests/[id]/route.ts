/**
 * PATCH /api/requests/[id] — set a feature request's status (admins only).
 *
 * Body: { status: 'open' | 'planned' | 'in_progress' | 'shipped' | 'declined' }
 * → 200 { ok: true } | 400 bad status | 401 | 403 not an admin | 404 not a feature request
 */
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { isFeatureStatus } from '@/lib/features';
import { setFeatureStatus } from '@/lib/firestore';
import { requireUserApi } from '@/lib/session';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserApi();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!isAdmin(user.id)) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  if (!isFeatureStatus(body?.status)) {
    return NextResponse.json({ ok: false, error: 'invalid status' }, { status: 400 });
  }
  const updated = await setFeatureStatus(id, body.status);
  if (!updated) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
