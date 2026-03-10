/**
 * Verify that JSON was not modified by checking the signature with the public key from Goodkey.
 *
 * Usage: npx ts-node scripts/verify_json_with_signature.ts <json_path> <signature_path> [algorithm]
 *   json_path      - path to file containing the JSON string (UTF-8)
 *   signature_path - path to file containing the base64url signature
 *   algorithm      - optional, e.g. RSASSA_PKCS1_2048_SHA256 (default)
 *
 * Env: API_SIGNING_ACCESS_TOKEN, TEST_SIGNING_CERTIFICATE_ID (same as for sign_json_to_file)
 */

import * as path from 'path';
require('dotenv').config({ path: path.resolve(__dirname, '../env/.env.dev') });

import * as fs from 'fs';
import { getTokenMetadata, getCertificateMetadata, getPublicKey } from '../api';
import { verifySignatureWithPublicKey } from '../utils';

const DEFAULT_ALGORITHM = 'RSASSA_PKCS1_2048_SHA256';

async function main(): Promise<void> {
  const [, , jsonPath, signaturePath, algorithmArg] = process.argv;
  if (!jsonPath || !signaturePath) {
    console.error(
      'Usage: npx ts-node scripts/verify_json_with_signature.ts <json_path> <signature_path> [algorithm]'
    );
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

  const { organization } = await getTokenMetadata(accessToken);
  const certMeta = await getCertificateMetadata(accessToken, organization.id, certificateId);
  const keyId = certMeta.key.id;
  const algorithm = algorithmArg ?? certMeta.key?.algorithms?.[0] ?? DEFAULT_ALGORITHM;

  const keyBlob = await getPublicKey(accessToken, keyId);
  const publicKeyPem = await keyBlob.text();

  const jsonUtf8 = fs.readFileSync(path.resolve(jsonPath), 'utf-8');
  const dataBuffer = Buffer.from(jsonUtf8, 'utf-8');
  const signature = fs.readFileSync(path.resolve(signaturePath), 'utf-8').trim();

  const valid = verifySignatureWithPublicKey(dataBuffer, signature, publicKeyPem, algorithm);

  if (valid) {
    console.log('OK: Signature is valid, JSON was not modified.');
  } else {
    console.error('FAIL: Signature verification failed.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
