// node --test api/_lib — builds a throwaway root → intermediate → leaf chain with openssl,
// shaped like Apple's (marker extensions included), and pins that root instead of Apple's.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { X509Certificate, generateKeyPairSync, sign, verify } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { MESSAGES, PRODUCTS, handleRetentionRequest, oidDer, signPromotionalOffer, verifyAppleJws } from './retention.mjs';

const dir = mkdtempSync(join(tmpdir(), 'retention-'));
const ssl = (...args) => execFileSync('openssl', args, { cwd: dir, stdio: 'pipe' });
const ext = (name, body) => writeFileSync(join(dir, name), body);

function makeChain({ leafOid = '1.2.840.113635.100.6.11.1' } = {}) {
  for (const k of ['root', 'int', 'leaf']) ssl('ecparam', '-name', 'prime256v1', '-genkey', '-noout', '-out', `${k}.key`);
  ext('root.ext', 'basicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n');
  ext('int.ext', 'basicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n1.2.840.113635.100.6.2.1=ASN1:NULL\n');
  ext('leaf.ext', `basicConstraints=critical,CA:FALSE\n${leafOid}=ASN1:NULL\n`);
  ssl('req', '-new', '-x509', '-key', 'root.key', '-subj', '/CN=Test Root', '-days', '30', '-out', 'root.pem', '-extensions', 'v3', '-config', writeConf('root.ext'));
  ssl('req', '-new', '-key', 'int.key', '-subj', '/CN=Test Intermediate', '-out', 'int.csr');
  ssl('x509', '-req', '-in', 'int.csr', '-CA', 'root.pem', '-CAkey', 'root.key', '-CAcreateserial', '-days', '30', '-extfile', join(dir, 'int.ext'), '-out', 'int.pem');
  ssl('req', '-new', '-key', 'leaf.key', '-subj', '/CN=Test Leaf', '-out', 'leaf.csr');
  ssl('x509', '-req', '-in', 'leaf.csr', '-CA', 'int.pem', '-CAkey', 'int.key', '-CAcreateserial', '-days', '30', '-extfile', join(dir, 'leaf.ext'), '-out', 'leaf.pem');
  const cert = (f) => new X509Certificate(readFileSync(join(dir, f)));
  return { certs: ['leaf.pem', 'int.pem', 'root.pem'].map(cert), leafKey: readFileSync(join(dir, 'leaf.key'), 'utf8') };
}
function writeConf(extFile) {
  const conf = join(dir, `${extFile}.cnf`);
  writeFileSync(conf, `[req]\ndistinguished_name=dn\n[dn]\n[v3]\n${readFileSync(join(dir, extFile), 'utf8')}`);
  return conf;
}

const chain = makeChain();
const ROOT = chain.certs[2].fingerprint256;
const b64u = (s) => Buffer.from(s).toString('base64url');

function appleSign(payload, { certs = chain.certs, key = chain.leafKey } = {}) {
  const header = { alg: 'ES256', x5c: certs.map((c) => c.raw.toString('base64')) };
  const input = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`;
  return `${input}.${sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}

const offerKeys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const NOW = Date.now();
const config = {
  ready: true,
  bundleId: 'com.belevate.weekwell',
  appAppleId: 6700000000,
  keyId: 'KEY123',
  issuerId: 'issuer-uuid',
  privateKey: offerKeys.privateKey.export({ type: 'pkcs8', format: 'pem' }),
  offerIdentifier: 'stay_half_month',
  rootSha256: ROOT,
};
const request = (over = {}) => ({
  originalTransactionId: '2000000123456789',
  appAppleId: 6700000000,
  productId: PRODUCTS.monthly,
  userLocale: 'en-US',
  requestIdentifier: 'a3f1c0de-0000-4000-8000-000000000000',
  environment: 'Production',
  signedDate: NOW,
  ...over,
});
const call = (payload, cfg = config) => handleRetentionRequest({ signedPayload: appleSign(payload) }, cfg, NOW);

test('OID encoding matches the DER in a real certificate', () => {
  assert.deepEqual([...oidDer('1.2.840.113635.100.6.11.1')], [0x06, 0x0a, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x63, 0x64, 0x06, 0x0b, 0x01]);
  assert.ok(chain.certs[0].raw.includes(oidDer('1.2.840.113635.100.6.11.1')));
});

test('a monthly subscriber gets the half-price month, signed for their transaction', () => {
  const [status, body] = call(request());
  assert.equal(status, 200);
  assert.deepEqual(Object.keys(body), ['promotionalOffer']);
  assert.equal(body.promotionalOffer.messageIdentifier, MESSAGES.offer.id);
  const [h, p, s] = body.promotionalOffer.promotionalOfferSignatureV2.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(h, 'base64url')), { alg: 'ES256', typ: 'JWT', kid: 'KEY123' });
  const claims = JSON.parse(Buffer.from(p, 'base64url'));
  assert.equal(claims.aud, 'promotional-offer');
  assert.equal(claims.iss, 'issuer-uuid');
  assert.equal(claims.bid, 'com.belevate.weekwell');
  assert.equal(claims.productId, PRODUCTS.monthly);
  assert.equal(claims.offerIdentifier, 'stay_half_month');
  assert.equal(claims.transactionId, '2000000123456789');
  assert.match(claims.nonce, /^[0-9a-f-]{36}$/u);
  const ok = verify('sha256', Buffer.from(`${h}.${p}`), { key: offerKeys.publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'));
  assert.ok(ok, 'signature verifies with the IAP key');
});

test('a weekly subscriber is offered the same month on the monthly plan', () => {
  const [, body] = call(request({ productId: PRODUCTS.weekly }));
  const claims = JSON.parse(Buffer.from(body.promotionalOffer.promotionalOfferSignatureV2.split('.')[1], 'base64url'));
  assert.equal(claims.productId, PRODUCTS.monthly);
});

test('a yearly subscriber gets the default message, no offer', () => {
  assert.deepEqual(call(request({ productId: PRODUCTS.yearly })), [200, { message: { messageIdentifier: MESSAGES.default.id } }]);
});

test('sandbox requests work without an appAppleId', () => {
  const [status] = call(request({ environment: 'Sandbox', appAppleId: undefined }));
  assert.equal(status, 200);
});

test('rejects: another app, stale or future requests, missing fields', () => {
  assert.equal(call(request({ appAppleId: 1 }))[0], 403);
  assert.equal(call(request({ appAppleId: undefined }))[0], 403);
  assert.equal(call(request({ signedDate: NOW - 10 * 60_000 }))[0], 401);
  assert.equal(call(request({ signedDate: NOW + 10 * 60_000 }))[0], 401);
  assert.equal(call(request({ originalTransactionId: '' }))[0], 400);
});

test('rejects: untrusted root, broken chain, missing marker extension, tampered payload, bad body', () => {
  assert.deepEqual(call(request(), { ...config, rootSha256: 'AA:BB' }), [401, { error: 'untrusted_root' }]);
  const swapped = appleSign(request(), { certs: [chain.certs[1], chain.certs[0], chain.certs[2]] });
  assert.equal(handleRetentionRequest({ signedPayload: swapped }, config, NOW)[1].error, 'invalid_chain');
  const unmarked = makeChain({ leafOid: '1.2.3.4' });
  const unmarkedJws = appleSign(request(), { certs: unmarked.certs, key: unmarked.leafKey });
  assert.equal(handleRetentionRequest({ signedPayload: unmarkedJws }, { ...config, rootSha256: unmarked.certs[2].fingerprint256 }, NOW)[1].error, 'invalid_chain');
  const good = appleSign(request()).split('.');
  const tampered = [good[0], b64u(JSON.stringify(request({ productId: PRODUCTS.weekly, originalTransactionId: '9' }))), good[2]].join('.');
  assert.throws(() => verifyAppleJws(tampered, { rootSha256: ROOT }), /bad_signature/u);
  assert.equal(handleRetentionRequest({ signedPayload: tampered }, config, NOW)[1].error, 'bad_signature');
  assert.equal(handleRetentionRequest({}, config, NOW)[0], 401);
  assert.equal(handleRetentionRequest(null, config, NOW)[0], 401);
});

test('not configured: 503, so Apple shows the default message', () => {
  assert.deepEqual(handleRetentionRequest({ signedPayload: 'x' }, { ...config, ready: false }), [503, { error: 'not_configured' }]);
});

test('message text fits Apple limits (header 66, body 144)', () => {
  for (const m of Object.values(MESSAGES)) {
    assert.ok(m.header.length <= 66 && m.body.length <= 144, m.id);
  }
});
