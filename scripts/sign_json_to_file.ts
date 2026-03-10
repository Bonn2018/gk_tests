/**
 * Sign arbitrary JSON (UTF-8 string) in Goodkey and write the signature to a file.
 *
 * Usage: npx ts-node scripts/sign_json_to_file.ts <input_path> <output_path>
 *   input_path  - path to file containing the JSON string (UTF-8)
 *   output_path - path where the base64url signature will be written
 *
 * Env: API_SIGNING_ACCESS_TOKEN, TEST_SIGNING_CERTIFICATE_ID (or run npm run prepare_env first)
 */

import * as path from 'path';
require('dotenv').config({ path: path.resolve(__dirname, '../env/.env.dev') });

import * as crypto from 'crypto';
import * as fs from 'fs';
import {
  getTokenMetadata,
  getCertificateMetadata,
  createSignOperation,
  finalizeOperation,
  getKeyMetadata,
} from '../api';
import { toBase64Url } from '../utils';

async function main(): Promise<void> {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    console.error('Usage: npx ts-node scripts/sign_json_to_file.ts <input_path> <output_path>');
    process.exit(1);
  }

  const accessToken = process.env.API_SIGNING_ACCESS_TOKEN;
  const certificateId = process.env.TEST_SIGNING_CERTIFICATE_ID;
  if (!accessToken) {
    console.error('API_SIGNING_ACCESS_TOKEN is required');
    process.exit(1);
  }
  if (!certificateId) {
    console.error('TEST_SIGNING_CERTIFICATE_ID is required');
    process.exit(1);
  }

  const jsonUtf8 = fs.readFileSync(path.resolve(inputPath), 'utf-8');
  const dataBuffer = Buffer.from(jsonUtf8, 'utf-8');
  const hashHex = crypto.createHash('sha256').update(dataBuffer).digest('hex');
  const base64urlHash = toBase64Url(Buffer.from(hashHex, 'hex'));

  const { organization } = await getTokenMetadata(accessToken);
  const certMeta = await getCertificateMetadata(accessToken, organization.id, certificateId);
  const keyId = certMeta.key.id;
  const algorithm = certMeta.key?.algorithms?.[0] ?? (await getKeyMetadata(accessToken, keyId)).algorithms?.[0];
  if (!algorithm) {
    console.error('Key has no algorithms');
    process.exit(1);
  }

  const signOp = await createSignOperation(accessToken, keyId, algorithm);
  const finalized = await finalizeOperation(accessToken, keyId, signOp.id, base64urlHash);
  const signature = finalized.data;

  fs.writeFileSync(path.resolve(outputPath), signature, { encoding: 'utf-8', flag: 'w' });
  console.log('Signature written to', outputPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
