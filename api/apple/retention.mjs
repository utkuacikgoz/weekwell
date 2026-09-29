/**
 * Get Retention Message endpoint (D-050): POST https://weekwell.pro/api/apple/retention
 * Apple calls this when a subscriber may cancel; see api/_lib/retention.mjs.
 */
import { handleRetentionRequest, loadRetentionConfig } from '../_lib/retention.mjs';

const config = loadRetentionConfig();

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const [status, payload] = handleRetentionRequest(body, config);
  return Response.json(payload, { status, headers: { 'Cache-Control': 'no-store' } });
}
