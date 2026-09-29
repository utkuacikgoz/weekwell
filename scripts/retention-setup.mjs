#!/usr/bin/env node
/**
 * One-time setup for the cancel-screen offer (D-050, RM3), run by the account owner.
 * Talks to Apple's Retention Messaging API with the In-App Purchase key.
 *
 *   export APPLE_IAP_KEY_ID=... APPLE_IAP_ISSUER_ID=... APPLE_IAP_PRIVATE_KEY="$(cat SubscriptionKey_XXXX.p8)"
 *   node scripts/retention-setup.mjs <sandbox|production> messages       # upload both messages
 *   node scripts/retention-setup.mjs <env> status                        # message states, default messages, URL
 *   node scripts/retention-setup.mjs <env> defaults                      # default message for all 3 plans (after APPROVED)
 *   node scripts/retention-setup.mjs <env> url https://weekwell.pro/api/apple/retention
 *   node scripts/retention-setup.mjs sandbox perf-test <originalTransactionId>
 *   node scripts/retention-setup.mjs sandbox perf-result <requestId>
 *
 * Steps and order: apps/mobile/docs/release/retention-offer.md
 */
import { createPrivateKey, sign } from 'node:crypto';
import { MESSAGES, PRODUCTS } from '../api/_lib/retention.mjs';

const [envName, command, arg] = process.argv.slice(2);
const HOSTS = { sandbox: 'https://api.storekit-sandbox.apple.com', production: 'https://api.storekit.apple.com' };
const LOCALE = 'en-US';

function die(msg) {
  console.error(msg);
  process.exit(1);
}
if (!HOSTS[envName] || !command) die('Usage: node scripts/retention-setup.mjs <sandbox|production> <messages|status|defaults|url|perf-test|perf-result> [arg]');
const { APPLE_IAP_KEY_ID: keyId, APPLE_IAP_ISSUER_ID: issuerId, APPLE_IAP_PRIVATE_KEY: rawKey, APPLE_BUNDLE_ID: bundleId = 'com.belevate.weekwell' } = process.env;
if (!keyId || !issuerId || !rawKey) die('Set APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID and APPLE_IAP_PRIVATE_KEY (the .p8 contents).');
const key = createPrivateKey(rawKey.replace(/\\n/gu, '\n'));

const b64u = (s) => Buffer.from(s).toString('base64url');
function bearer() {
  const now = Math.floor(Date.now() / 1000);
  const input = `${b64u(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }))}.${b64u(JSON.stringify({ iss: issuerId, iat: now, exp: now + 300, aud: 'appstoreconnect-v1', bid: bundleId }))}`;
  return `${input}.${sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}

async function api(method, path, body) {
  const res = await fetch(`${HOSTS[envName]}/inApps/v1/messaging${path}`, {
    method,
    headers: { Authorization: `Bearer ${bearer()}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (res.status === 404 && !json) die('404: this developer account has no Retention Messaging API access yet. Request it first (see the doc).');
  return { status: res.status, json };
}

const show = (label, r) => console.log(`${label}: ${r.status}${r.json ? ` ${JSON.stringify(r.json)}` : ''}`);

switch (command) {
  case 'messages':
    for (const [name, m] of Object.entries(MESSAGES)) {
      const r = await api('PUT', `/message/${m.id}`, { header: m.header, body: m.body });
      show(`${name} message ${m.id}${r.status === 409 ? ' (already uploaded)' : ''}`, r);
    }
    break;
  case 'status': {
    show('messages', await api('GET', '/message/list'));
    for (const p of Object.values(PRODUCTS)) show(`default ${p} ${LOCALE}`, await api('GET', `/default/${p}/${LOCALE}`));
    show('realtime url', await api('GET', '/realtime/url'));
    break;
  }
  case 'defaults':
    for (const p of Object.values(PRODUCTS)) show(`default ${p}`, await api('PUT', `/default/${p}/${LOCALE}`, { messageIdentifier: MESSAGES.default.id }));
    break;
  case 'url':
    if (!arg?.startsWith('https://')) die('Give the https URL, e.g. https://weekwell.pro/api/apple/retention');
    show('realtime url', await api('PUT', '/realtime/url', { realtimeURL: arg }));
    break;
  case 'perf-test':
    if (envName !== 'sandbox' || !arg) die('perf-test runs in sandbox and needs the originalTransactionId of an active sandbox subscription.');
    show('performance test', await api('POST', '/performanceTest', { originalTransactionId: arg }));
    break;
  case 'perf-result':
    if (envName !== 'sandbox' || !arg) die('perf-result runs in sandbox and needs the requestId from perf-test.');
    show('performance result', await api('GET', `/performanceTest/result/${arg}`));
    break;
  default:
    die(`Unknown command: ${command}`);
}
