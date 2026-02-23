/**
 * Shared helpers for scripts (e.g. prepare_env): CLI parsing, env file read/write, token list helpers.
 */

import * as fs from 'fs';
import * as path from 'path';
import { updateToken } from '../api';

const ENV_PATH = path.resolve(__dirname, '../env/.env.dev');

export function parseTokenFromArgv(): string | null {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-t' && args[i + 1]) return args[i + 1];
    const match = args[i].match(/^--token=(.+)$/);
    if (match) return match[1];
  }
  return null;
}

/** Read env file into key-value map. Values are raw (may include quotes). */
export function readEnvFile(): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(ENV_PATH)) return out;
  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/** Write env map to file. Merges with existing: our keys overwrite. */
export function writeEnvFile(updates: Record<string, string>): void {
  const current = readEnvFile();
  const merged = { ...current, ...updates };
  const dir = path.dirname(ENV_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const lines = Object.entries(merged).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n', 'utf-8');
}

export function appendEnv(updates: Record<string, string>): void {
  const current = readEnvFile();
  writeEnvFile({ ...current, ...updates });
}

/** Merge a new id into a list (no duplicates). */
export function addToTokenIds(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id];
}

/** Add key id to token and call API; returns new key list. */
export async function addKeyToToken(
  token: string,
  organizationId: string,
  tokenId: string,
  currentKeyIds: string[],
  currentCertIds: string[],
  newKeyId: string
): Promise<string[]> {
  const keyIds = addToTokenIds(currentKeyIds, newKeyId);
  await updateToken(token, organizationId, tokenId, { keys: keyIds, certificates: currentCertIds });
  return keyIds;
}

/** Add certificate id to token and call API; returns new cert list. */
export async function addCertToToken(
  token: string,
  organizationId: string,
  tokenId: string,
  currentKeyIds: string[],
  currentCertIds: string[],
  newCertId: string
): Promise<string[]> {
  const certIds = addToTokenIds(currentCertIds, newCertId);
  await updateToken(token, organizationId, tokenId, { keys: currentKeyIds, certificates: certIds });
  return certIds;
}
