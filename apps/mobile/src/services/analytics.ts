/**
 * Analytics transport. For the pilot the sink keeps events on-device (and logs
 * them in development). No network destination is configured yet; adding one
 * requires a decision-log entry (retention, vendor, data processing terms).
 */
import { createAnalytics, type AnalyticsEvent } from '@weekwell/domain';

const buffer: AnalyticsEvent[] = [];
const MAX_BUFFER = 500;

export function newAnonId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return `anon_${id}`;
}

export function makeAnalytics(anonId: string) {
  return createAnalytics((event) => {
    buffer.push(event);
    if (buffer.length > MAX_BUFFER) buffer.shift();
    if (__DEV__) console.log('[analytics]', event.name, event.props);
  }, anonId);
}

export function recentEvents(): readonly AnalyticsEvent[] {
  return buffer;
}
