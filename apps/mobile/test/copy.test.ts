import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { FORBIDDEN_PHRASES as FORBIDDEN } from '../src/forbidden.ts';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|json)$/u.test(p) ? [p] : [];
  });
}

/** String literals and JSX text only: comments are allowed to name what we avoid. */
function userFacingStrings(src: string): string[] {
  const noComments = src.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/(^|[^:])\/\/.*$/gmu, '$1');
  const literals = [...noComments.matchAll(/(['"`])((?:\\.|(?!\1).)*)\1/gu)].map((m) => m[2] ?? '');
  const jsxText = [...noComments.matchAll(/>([^<>{}]+)</gu)].map((m) => m[1] ?? '');
  return [...literals, ...jsxText].filter((s) => /[a-z]{3}/iu.test(s));
}

test('no forbidden product language in user-facing strings', () => {
  const root = join(process.cwd(), 'src');
  const hits: string[] = [];
  for (const file of files(root)) {
    if (file.endsWith('forbidden.ts')) continue; // holds the list itself
    for (const s of userFacingStrings(readFileSync(file, 'utf8'))) {
      for (const re of FORBIDDEN) if (re.test(s)) hits.push(`${file}: "${s}" matches ${re}`);
    }
  }
  assert.deepEqual(hits, []);
});

test('no secrets or keys in the client source', () => {
  const root = process.cwd();
  const hits: string[] = [];
  for (const file of [...files(join(root, 'src')), join(root, 'app.json')]) {
    const src = readFileSync(file, 'utf8');
    if (/(sk|rk)_(live|test)_[A-Za-z0-9]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|api[_-]?key\s*[:=]\s*['"][^'"]{8,}/u.test(src)) hits.push(file);
  }
  assert.deepEqual(hits, []);
});

test('the client never imports server-only domain code', () => {
  const root = join(process.cwd(), 'src');
  const hits = files(root).filter((f) => /@weekwell\/domain\/server|node:crypto/u.test(readFileSync(f, 'utf8')));
  assert.deepEqual(hits, []);
});
