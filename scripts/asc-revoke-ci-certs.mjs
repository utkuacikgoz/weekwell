#!/usr/bin/env node
/**
 * Revokes the Apple Development certificates our TestFlight builds leave behind.
 *
 * Every build runs on a fresh cloud Mac, and Xcode's automatic signing creates a new development
 * certificate there through the App Store Connect API ("Created via API"). Apple caps how many an
 * account can hold, so without this the builds stop after ~20 runs with "Your account has reached
 * the maximum number of certificates". Distribution signing is cloud-managed and unaffected.
 *
 * Only development certificates whose name says "Created via API" are touched, so certificates made
 * on a developer's own Mac stay. Never fails the build: problems are printed as warnings.
 *
 *   ASC_KEY_PATH=… ASC_KEY_ID=… ASC_ISSUER_ID=… node scripts/asc-revoke-ci-certs.mjs
 */
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const { ASC_KEY_PATH, ASC_KEY_ID, ASC_ISSUER_ID } = process.env;
const warn = (msg) => console.log(`::warning::${msg}`);

function token() {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const input = `${b64({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' })}.${b64({ iss: ASC_ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' })}`;
  const key = createPrivateKey(readFileSync(ASC_KEY_PATH, 'utf8'));
  return `${input}.${sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}

/** Development certificates Xcode created through the API (on our build machines). */
export function isCiDevelopmentCert(cert) {
  const a = cert?.attributes ?? {};
  const dev = a.certificateType === 'DEVELOPMENT' || a.certificateType === 'IOS_DEVELOPMENT';
  return dev && /created via api/iu.test(`${a.name ?? ''} ${a.displayName ?? ''}`);
}

async function main() {
  if (!ASC_KEY_PATH || !ASC_KEY_ID || !ASC_ISSUER_ID) return warn('Certificate cleanup skipped: App Store Connect key not available.');
  const auth = { Authorization: `Bearer ${token()}` };
  const url = 'https://api.appstoreconnect.apple.com/v1/certificates?filter[certificateType]=DEVELOPMENT,IOS_DEVELOPMENT&limit=200';
  const res = await fetch(url, { headers: auth });
  if (!res.ok) return warn(`Certificate cleanup skipped: listing certificates returned ${res.status}.`);
  const certs = ((await res.json()).data ?? []).filter(isCiDevelopmentCert);
  let revoked = 0;
  for (const c of certs) {
    const del = await fetch(`https://api.appstoreconnect.apple.com/v1/certificates/${c.id}`, { method: 'DELETE', headers: auth });
    if (del.ok) revoked++;
    else warn(`Couldn't revoke certificate ${c.attributes?.name ?? c.id}: ${del.status}.`);
  }
  console.log(`Build-machine development certificates revoked: ${revoked} of ${certs.length}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => warn(`Certificate cleanup skipped: ${e instanceof Error ? e.message : e}`));
}
