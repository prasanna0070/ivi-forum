/** Status pill for a feature request (Open, Planned, In progress, Shipped, Not planned). */
import { FEATURE_STATUS_CLASS, FEATURE_STATUS_LABEL } from '@/lib/features';
import type { FeatureStatus } from '@/lib/types';

export default function FeatureStatusBadge({ status }: { status: FeatureStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-input border px-2 py-0.5 text-xs font-semibold ${FEATURE_STATUS_CLASS[status]}`}
    >
      {FEATURE_STATUS_LABEL[status]}
    </span>
  );
}
