import { promises as fs } from 'node:fs';

/**
 * Persist a Dilithium-5 key-pair to disk.
 * Files:  <tag>_pub.key   and   <tag>_sec.key
 */
export async function saveKeyPair({ publicKey, secretKey }, tag = 'dilithium5') {
  await fs.writeFile(`${tag}_pub.key`, Buffer.from(publicKey).toString('hex'));
  await fs.writeFile(`${tag}_sec.key`, Buffer.from(secretKey).toString('hex'));
}

/**
 * Reload a key-pair from disk and return the same shape
 * that dilithium5.keygen() gives: { publicKey, secretKey }.
 */
export async function loadKeyPair(tag = 'dilithium5') {
  const publicKey = Buffer.from(await fs.readFile(`${tag}_pub.key`, 'utf8'), 'hex');
  const secretKey = Buffer.from(await fs.readFile(`${tag}_sec.key`, 'utf8'), 'hex');
  return { publicKey, secretKey };
}
