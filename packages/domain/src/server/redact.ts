/**
 * Log redaction (security baseline): email, allergy/exclusion data, location,
 * payment identifiers, access tokens, and raw prompts never reach ordinary logs.
 */
const SENSITIVE_KEYS = /^(email|exclusions?|allerg\w*|location|lat|lng|latitude|longitude|address|zip|zipcode|postal\w*|token|access_?token|refresh_?token|authorization|password|secret|api_?key|card\w*|payment\w*|receipt|transaction_?id|prompt|system|raw_?output)$/iu;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu;
const BEARER = /\b(bearer\s+)[A-Za-z0-9._~+/=-]{8,}/giu;
const LONG_SECRET = /\b(sk|pk|rk|key|tok)_[A-Za-z0-9]{12,}\b/gu;

export function redactString(s: string): string {
  return s.replace(EMAIL, '[email]').replace(BEARER, '$1[token]').replace(LONG_SECRET, '[secret]');
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[depth]';
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = SENSITIVE_KEYS.test(k) ? '[redacted]' : redact(v, depth + 1);
    return out;
  }
  return value;
}
