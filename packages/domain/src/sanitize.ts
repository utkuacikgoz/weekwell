/**
 * Untrusted text handling. Retailer product names, recipe text, model output,
 * and custom exclusions are data, never instructions. They are rendered as
 * plain text only and never concatenated into a model's system instructions.
 */

// Control characters, zero-width and bidi-override characters.
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤﻿]/gu;
const TAGS = /<[^>]{0,200}>/gu;
const MARKDOWN_LINK = /\[([^\]]{0,200})\]\([^)]{0,500}\)/gu;

/** Strip markup and invisible characters, collapse whitespace, and cap length. */
export function sanitizeText(input: unknown, maxLength = 200): string {
  if (typeof input !== 'string') return '';
  const cleaned = input
    .normalize('NFKC')
    .replace(INVISIBLE, '')
    .replace(MARKDOWN_LINK, '$1')
    .replace(TAGS, '')
    .replace(/[<>]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trimEnd()}…` : cleaned;
}

const INSTRUCTION_PATTERNS = [
  /ignore (all |any )?(previous|prior|above) (instructions|rules)/iu,
  /\bsystem prompt\b/iu,
  /\byou are now\b/iu,
  /\bdisregard\b.*\b(rules|instructions)\b/iu,
  /\b(allerg(y|ies|en)s?)\b.*\b(safe|exempt|ignore|ok to eat)\b/iu,
];

/**
 * Flags text that reads like an instruction. This is only a signal for audit
 * logs and review; safety never depends on it, because untrusted text is
 * never given authority in the first place.
 */
export function looksLikeInstruction(input: string): boolean {
  return INSTRUCTION_PATTERNS.some((p) => p.test(input));
}
