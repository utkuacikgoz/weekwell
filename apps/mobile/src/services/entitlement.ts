/**
 * Entitlement mock (first slice, item 9). Stands in for the server: it owns
 * the clock and the record. The app only ever reads a derived view. Purchase
 * UI stays disabled while the view is `loading` or `error`.
 */
import {
  applyStoreEvent,
  deriveEntitlement,
  emptyEntitlement,
  EntitlementTransitionError,
  type EntitlementRecord,
  type EntitlementView,
  type ProductId,
} from '@weekwell/domain';
import type { RestoreScenario } from './scenarios';

const LATENCY_MS = 400;
const wait = () => new Promise((r) => setTimeout(r, LATENCY_MS));
/** Server clock. In production this is the backend's time, never the device's. */
const serverNow = () => new Date();

export class MockEntitlementServer {
  constructor(private record: EntitlementRecord) {}

  static fresh(ownerId: string) {
    return new MockEntitlementServer(emptyEntitlement(ownerId, serverNow()));
  }

  snapshot(): EntitlementRecord {
    return this.record;
  }

  async view(): Promise<EntitlementView> {
    await wait();
    return deriveEntitlement(this.record, serverNow());
  }

  async startTrial(productId: ProductId): Promise<{ ok: true; view: EntitlementView } | { ok: false; reason: 'trial_already_used' | 'failed' }> {
    await wait();
    try {
      this.record = applyStoreEvent(this.record, { type: 'trial_started', productId, at: serverNow().toISOString() });
      return { ok: true, view: deriveEntitlement(this.record, serverNow()) };
    } catch (e) {
      if (e instanceof EntitlementTransitionError && e.code === 'trial_already_used') return { ok: false, reason: 'trial_already_used' };
      return { ok: false, reason: 'failed' };
    }
  }

  async restore(scenario: RestoreScenario): Promise<'restored' | 'nothing_to_restore' | 'failed'> {
    await wait();
    if (scenario === 'error') return 'failed';
    const view = deriveEntitlement(this.record, serverNow());
    return view.state === 'trial' || view.state === 'active' ? 'restored' : 'nothing_to_restore';
  }
}
