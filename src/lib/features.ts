/**
 * Feature requests — shared constants for the /requests tab (server + client).
 * A feature request is a Topic with kind 'feature'; votes and comments reuse
 * the forum's machinery.
 */
import type { FeatureStatus, Topic } from '@/lib/types';

export const FEATURE_STATUSES: FeatureStatus[] = ['open', 'planned', 'in_progress', 'shipped', 'declined'];

export const FEATURE_STATUS_LABEL: Record<FeatureStatus, string> = {
  open: 'Open',
  planned: 'Planned',
  in_progress: 'In progress',
  shipped: 'Shipped',
  declined: 'Not planned',
};

/** Badge styling per status, from the site's own tokens. */
export const FEATURE_STATUS_CLASS: Record<FeatureStatus, string> = {
  open: 'border-border bg-white text-brand',
  planned: 'border-brand-light/40 bg-surface-2 text-brand',
  in_progress: 'border-brand bg-brand text-white',
  shipped: 'border-mint bg-mint-light text-ink',
  declined: 'border-border bg-surface text-muted',
};

export function isFeatureStatus(value: unknown): value is FeatureStatus {
  return typeof value === 'string' && (FEATURE_STATUSES as string[]).includes(value);
}

export function isFeatureRequest(topic: Pick<Topic, 'kind'>): boolean {
  return topic.kind === 'feature';
}

/** Status of a feature request, treating a missing value as 'open'. */
export function featureStatus(topic: Pick<Topic, 'status'>): FeatureStatus {
  return isFeatureStatus(topic.status) ? topic.status : 'open';
}
