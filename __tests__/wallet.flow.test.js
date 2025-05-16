// __tests__/wallet.flow.test.js
//
// End-to-end sanity test for the wallet CLI.
// Runs in about 2-3 s on most machines.
//

import { execSync } from 'node:child_process';
import fs           from 'node:fs';
import path         from 'node:path';
import { fileURLToPath } from 'node:url';

// -------- helpers -----------------------------------------------------------
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'); // “…/legacy-wallet”
const walletJS = path.join(repoRoot, 'wallet.js');
const WALLET   = path.join(repoRoot, 'wallet.json');
const LOCKFILE = path.join(repoRoot, 'wallet.lock');

function run (args) {
  return execSync(`node "${walletJS}" ${args}`, {
    cwd: repoRoot,
    stdio: 'pipe',
    encoding: 'utf8'
  });
}
// ---------------------------------------------------------------------------

describe('CLI round-trip for each alg', () => {

  /** 1️⃣  keygen → sign → verify (all algs) */
  test.each(['ecdsa', 'dilithium', 'falcon'])('%s flow', alg => {
    run(`gen --alg ${alg}`);
    const sig = run(`sign --raw "flow-test"`).trim();          // base64 only
    const out = run(`verify "flow-test" ${sig}`);
    expect(out).toMatch(/✅ Signature valid/);
  });

  /** 2️⃣  lock → unlock round-trip (ECDSA only for speed) */
  test('ECDSA wallet survives lock ↔ unlock', () => {
    // start from a fresh wallet
    if (fs.existsSync(WALLET))   fs.unlinkSync(WALLET);
    if (fs.existsSync(LOCKFILE)) fs.unlinkSync(LOCKFILE);

    run('gen --alg ecdsa');

    const lockOut = run('lock');
    const ct = lockOut.match(/kyberCiphertext.*: ([A-Za-z0-9+/=]+)/)[1];
    const sk = lockOut.match(/kyberSecretKey.*: ([A-Za-z0-9+/=]+)/)[1];

    expect(fs.existsSync(LOCKFILE)).toBe(true);

    run(`unlock ${ct} ${sk}`);

    expect(fs.existsSync(WALLET)).toBe(true);
  });
});
