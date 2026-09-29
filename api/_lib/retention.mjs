/**
 * Apple Retention Messaging (D-050, RM3): what shows on the Confirm Cancellation sheet.
 *
 * Apple calls our Get Retention Message endpoint when a subscriber opens their subscription
 * in Settings and may cancel. We verify Apple's signed request and answer with a message
 * uploaded in advance (scripts/retention-setup.mjs). Weekly and monthly subscribers get a
 * half-price month on the monthly plan (a promotional offer set up in App Store Connect);
 * yearly subscribers get the plain default message.
 *
 * No dependencies: node:crypto only, so it runs as a Vercel function next to the static site.
 * The checks follow Apple's App Store Server Library (SignedDataVerifier, PromotionalOfferV2SignatureCreator).
 */
import { X509Certificate, createPrivateKey, randomUUID, sign, verify } from 'node:crypto';

/** SHA-256 of "Apple Root CA - G3" (https://www.apple.com/certificateauthority/). */
export const APPLE_ROOT_CA_G3_SHA256 = '63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79';

/** Message identifiers we upload once; the endpoint and the setup script share them. */
export const MESSAGES = {
  /** Default (no offer): shown to yearly subscribers, and by Apple whenever this endpoint fails. */
  default: {
    id: '8ebef7e9-3c79-4ee0-b81b-9d14e457e2e1',
    header: 'Your week is already planned',
    body: 'Five dinners and one grocery list, sorted every week.',
  },
  /** Goes with the promotional offer. The price must match the offer in App Store Connect. */
  offer: {
    id: 'c3d0dd34-b39b-46ad-86e1-d8d75f7409b4',
    header: 'Special offer: next month for $4.99',
    body: 'Half price on your next month, then $9.99 a month. Cancel anytime.',
  },
};

export const PRODUCTS = {
  weekly: 'com.belevate.weekwell.weekly',
  monthly: 'com.belevate.weekwell.monthly',
  yearly: 'com.belevate.weekwell.yearly',
};

/** Only weekly and monthly subscribers see the offer; it is always a month on the monthly plan. */
const OFFER_FOR = new Set([PRODUCTS.weekly, PRODUCTS.monthly]);

// Apple's marker extensions: leaf 1.2.840.113635.100.6.11.1, intermediate 1.2.840.113635.100.6.2.1.
const LEAF_OID = '1.2.840.113635.100.6.11.1';
const INTERMEDIATE_OID = '1.2.840.113635.100.6.2.1';
/** Apple signs just before calling; anything older is a replay. */
const MAX_AGE_MS = 5 * 60_000;

export class RetentionError extends Error {}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

/** DER encoding of an OID (tag, length, value), to find an extension in a certificate. */
export function oidDer(oid) {
  const [a, b, ...rest] = oid.split('.').map(Number);
  const bytes = [40 * a + b];
  for (const n of rest) {
    const out = [n & 0x7f];
    for (let v = Math.floor(n / 128); v > 0; v = Math.floor(v / 128)) out.unshift((v & 0x7f) | 0x80);
    bytes.push(...out);
  }
  return Buffer.from([0x06, bytes.length, ...bytes]);
}

function validAt(cert, at) {
  return new Date(cert.validFrom).getTime() <= at && at <= new Date(cert.validTo).getTime();
}

/**
 * Verifies a JWS signed by the App Store: x5c is [leaf, intermediate, root]; the root must be
 * Apple Root CA G3 (pinned), each certificate signs the next, both Apple marker extensions are
 * present, all three are valid at the signing date, and the ES256 signature matches the leaf.
 */
export function verifyAppleJws(jws, { rootSha256 = APPLE_ROOT_CA_G3_SHA256 } = {}) {
  const parts = typeof jws === 'string' ? jws.split('.') : [];
  if (parts.length !== 3) throw new RetentionError('malformed_jws');
  let header;
  let payload;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    throw new RetentionError('malformed_jws');
  }
  if (header.alg !== 'ES256' || !Array.isArray(header.x5c) || header.x5c.length !== 3) throw new RetentionError('invalid_chain');
  let leaf;
  let intermediate;
  let root;
  try {
    [leaf, intermediate, root] = header.x5c.map((c) => new X509Certificate(Buffer.from(c, 'base64')));
  } catch {
    throw new RetentionError('invalid_certificate');
  }
  if (root.fingerprint256 !== rootSha256) throw new RetentionError('untrusted_root');
  const chained =
    intermediate.issuer === root.subject &&
    intermediate.verify(root.publicKey) &&
    intermediate.ca &&
    leaf.issuer === intermediate.subject &&
    leaf.verify(intermediate.publicKey) &&
    leaf.raw.includes(oidDer(LEAF_OID)) &&
    intermediate.raw.includes(oidDer(INTERMEDIATE_OID));
  if (!chained) throw new RetentionError('invalid_chain');
  const signedAt = Number(payload.signedDate);
  if (!Number.isFinite(signedAt) || ![leaf, intermediate, root].every((c) => validAt(c, signedAt))) throw new RetentionError('certificate_expired');
  const ok = verify('sha256', Buffer.from(`${parts[0]}.${parts[1]}`), { key: leaf.publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(parts[2], 'base64url'));
  if (!ok) throw new RetentionError('bad_signature');
  return payload;
}

/** A promotional-offer signature, V2 (JWS), as Apple's PromotionalOfferV2SignatureCreator makes it. */
export function signPromotionalOffer({ privateKey, keyId, issuerId, bundleId, productId, offerIdentifier, transactionId, now = Date.now() }) {
  const header = { alg: 'ES256', typ: 'JWT', kid: keyId };
  const claims = { productId, offerIdentifier, transactionId, bid: bundleId, nonce: randomUUID(), iat: Math.floor(now / 1000), iss: issuerId, aud: 'promotional-offer' };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const signature = sign('sha256', Buffer.from(input), { key: createPrivateKey(privateKey), dsaEncoding: 'ieee-p1363' });
  return `${input}.${b64url(signature)}`;
}

/** Settings from the environment (Vercel project env vars). `ready` is false until the owner sets them. */
export function loadRetentionConfig(env = process.env) {
  const config = {
    bundleId: env.APPLE_BUNDLE_ID || 'com.belevate.weekwell',
    appAppleId: Number(env.APPLE_APP_APPLE_ID || 0),
    keyId: env.APPLE_IAP_KEY_ID || '',
    issuerId: env.APPLE_IAP_ISSUER_ID || '',
    // Vercel env vars keep newlines; "\n" escapes also work.
    privateKey: (env.APPLE_IAP_PRIVATE_KEY || '').replace(/\\n/gu, '\n'),
    offerIdentifier: env.RETENTION_OFFER_ID || '',
    rootSha256: env.APPLE_ROOT_SHA256_OVERRIDE || APPLE_ROOT_CA_G3_SHA256,
  };
  return { ...config, ready: Boolean(config.appAppleId && config.keyId && config.issuerId && config.privateKey && config.offerIdentifier) };
}

/**
 * Handles one Get Retention Message call: returns [status, body].
 * Anything unverifiable gets a 4xx with no body worth showing; Apple then falls back to the default message.
 */
export function handleRetentionRequest(body, config, now = Date.now()) {
  if (!config.ready) return [503, { error: 'not_configured' }];
  const signedPayload = body && typeof body === 'object' ? body.signedPayload : undefined;
  let request;
  try {
    request = verifyAppleJws(signedPayload, { rootSha256: config.rootSha256 });
  } catch (e) {
    return [401, { error: e instanceof RetentionError ? e.message : 'invalid' }];
  }
  // Apple: always check appAppleId, and don't respond if it isn't ours. Sandbox requests may omit it.
  if (request.environment === 'Production' ? request.appAppleId !== config.appAppleId : request.appAppleId && request.appAppleId !== config.appAppleId) {
    return [403, { error: 'wrong_app' }];
  }
  if (now - Number(request.signedDate) > MAX_AGE_MS || Number(request.signedDate) - now > MAX_AGE_MS) return [401, { error: 'stale' }];
  if (!request.originalTransactionId || !request.productId) return [400, { error: 'bad_request' }];

  if (!OFFER_FOR.has(request.productId)) return [200, { message: { messageIdentifier: MESSAGES.default.id } }];
  const signature = signPromotionalOffer({
    privateKey: config.privateKey,
    keyId: config.keyId,
    issuerId: config.issuerId,
    bundleId: config.bundleId,
    productId: PRODUCTS.monthly,
    offerIdentifier: config.offerIdentifier,
    transactionId: request.originalTransactionId,
    now,
  });
  return [200, { promotionalOffer: { messageIdentifier: MESSAGES.offer.id, promotionalOfferSignatureV2: signature } }];
}
