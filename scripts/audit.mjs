#!/usr/bin/env node
/**
 * CI dependency audit: production dependencies, high and critical only, with a short list of
 * advisories we accept on purpose. Each entry says why and must be re-checked when a fix ships.
 *
 *   node scripts/audit.mjs
 */
import { execFileSync } from 'node:child_process';

/** Advisory URL → why it doesn't reach users. */
const ACCEPTED = {
  // node-forge (every version, no fix yet): only reached through expo → @expo/cli →
  // @expo/code-signing-certificates, the build tooling that signs update manifests. It runs on the
  // build machine and is not in the app bundle; Weekwell doesn't use signed EAS Updates. Added 2026-10-02.
  'https://github.com/advisories/GHSA-86w9-cpqp-85rv': 'node-forge in Expo build tooling only',
};

let raw;
try {
  raw = execFileSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
  raw = e.stdout;
}
const report = JSON.parse(raw);
const blocking = [];
const accepted = [];
for (const [name, v] of Object.entries(report.vulnerabilities ?? {})) {
  for (const via of v.via) {
    if (typeof via !== 'object') continue; // inherited from another package; judged there
    if (via.severity !== 'high' && via.severity !== 'critical') continue;
    (ACCEPTED[via.url] ? accepted : blocking).push(`${via.severity} ${name}: ${via.title} (${via.url})`);
  }
}
for (const line of new Set(accepted)) console.log(`accepted  ${line} — ${ACCEPTED[line.match(/\((.*)\)$/)[1]]}`);
if (blocking.length) {
  for (const line of new Set(blocking)) console.error(`BLOCKING  ${line}`);
  process.exit(1);
}
console.log('No unaccepted high or critical advisories in production dependencies.');
