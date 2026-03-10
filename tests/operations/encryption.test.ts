/**
 * API Operations Tests - Encryption/Decryption
 *
 * Tests for encrypting data locally and decrypting via API
 */

import * as crypto from 'crypto';
import { X509Certificate } from '@peculiar/x509';
import {
  getTokenMetadata,
  getCertificateMetadata,
  downloadCertificate,
  getPublicKey,
  createDecryptOperation,
  finalizeOperation,
  getKeyMetadata,
} from '../../api';
import { encryptDataLocally, encryptDataWithPublicKey, fromBase64Url } from '../../utils';

const AES_GCM_IV_LEN = 12;
const AES_GCM_TAG_LEN = 16;

/** Create a new 32-byte symmetric key for AES-256-GCM */
function createAes256GcmKey(): Buffer {
  return crypto.randomBytes(32);
}

/** Encrypt (wrap) the symmetric key with Goodkey certificate public key. Returns base64url. */
async function encryptKeyWithGoodkey(
  aesKey: Buffer,
  cert: X509Certificate,
  algorithm: string
): Promise<string> {
  return encryptDataLocally(aesKey, cert, algorithm);
}

/** Encrypt (wrap) the symmetric key with Goodkey public key PEM. Returns base64url. */
function encryptKeyWithPublicKey(
  aesKey: Buffer,
  publicKeyPem: string,
  algorithm: string
): string {
  return encryptDataWithPublicKey(aesKey, publicKeyPem, algorithm);
}

/** Decrypt (unwrap) the key via Goodkey API. Returns raw key buffer. */
async function decryptKeyWithGoodkey(
  accessToken: string,
  keyId: string,
  algorithm: string,
  wrappedKeyBase64url: string
): Promise<Buffer> {
  const op = await createDecryptOperation(accessToken, keyId, algorithm);
  if (!op?.id) throw new Error('Failed to create decrypt operation');
  const result = await finalizeOperation(accessToken, keyId, op.id, wrappedKeyBase64url);
  if (result.operation?.status !== 'completed' || result.data == null) {
    throw new Error('Decrypt operation did not complete');
  }
  return fromBase64Url(result.data);
}

/** Encrypt plaintext with AES-256-GCM. Returns iv || ciphertext || authTag. */
function encryptWithAes256Gcm(key: Buffer, plaintext: string): Buffer {
  const iv = crypto.randomBytes(AES_GCM_IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(plaintext, 'utf-8')),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, authTag]);
}

/** Decrypt blob (iv || ciphertext || authTag) with AES-256-GCM. */
function decryptWithAes256Gcm(key: Buffer, blob: Buffer): string {
  const iv = blob.subarray(0, AES_GCM_IV_LEN);
  const authTag = blob.subarray(blob.length - AES_GCM_TAG_LEN);
  const ciphertext = blob.subarray(AES_GCM_IV_LEN, blob.length - AES_GCM_TAG_LEN);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8');
}

describe('API Operations - Encryption/Decryption', () => {
  // Test data
  let keyId: string;
  const plainText = 'Hello, this is a test message for encryption!';

  test('should encrypt data locally and decrypt via API', async () => {
    const ACCESS_TOKEN = process.env.API_ENCRYPT_ACCESS_TOKEN || process.env.API_SIGNING_ACCESS_TOKEN;
    const CERTIFICATE_ID = process.env.TEST_ENCRYPT_CERTIFICATE_ID;

    if (!ACCESS_TOKEN) {
      throw new Error('API_ENCRYPT_ACCESS_TOKEN or API_SIGNING_ACCESS_TOKEN is required. Set env or run: npm run prepare_env -- -t YOUR_TOKEN');
    }
    if (!CERTIFICATE_ID) {
      throw new Error('TEST_ENCRYPT_CERTIFICATE_ID is required. Set env or run: npm run prepare_env -- -t YOUR_TOKEN');
    }

    // Step 1: Get organization ID
    const tokenMetadata = await getTokenMetadata(ACCESS_TOKEN);
    const organizationId = tokenMetadata.organization.id;

    // Step 2: Get certificate metadata
    const certificate = await getCertificateMetadata(ACCESS_TOKEN, organizationId, CERTIFICATE_ID);
    expect(certificate).toBeDefined();
    keyId = certificate.key.id;
    expect(keyId).toBeDefined();

    // Get algorithm from key metadata
    const keyMetadata = await getKeyMetadata(ACCESS_TOKEN, keyId);
    const ENCRYPT_ALGORITHM = keyMetadata.algorithms?.[0];
    if (!ENCRYPT_ALGORITHM) {
      throw new Error('Key has no algorithms');
    }

    // Step 3: Download certificate
    const certificateBuffer = await downloadCertificate(ACCESS_TOKEN, organizationId, CERTIFICATE_ID);
    expect(certificateBuffer).toBeDefined();
    expect(certificateBuffer.length).toBeGreaterThan(0);

    // Verify certificate format using @peculiar/x509
    const cert = new X509Certificate(certificateBuffer);
    expect(cert).toBeDefined();

    // Step 4: Encrypt data locally using certificate's public key
    const plainTextBuffer = Buffer.from(plainText, 'utf-8');
    const encryptedData = await encryptDataLocally(plainTextBuffer, cert, ENCRYPT_ALGORITHM);
    expect(encryptedData).toBeDefined();
    expect(typeof encryptedData).toBe('string');
    expect(encryptedData.length).toBeGreaterThan(0);

    // Step 5: Create decryption operation via API
    const decryptOperation = await createDecryptOperation(ACCESS_TOKEN, keyId, ENCRYPT_ALGORITHM);
    expect(decryptOperation).toBeDefined();
    expect(decryptOperation.id).toBeDefined();
    const decryptOperationId = decryptOperation.id;
    expect(['pending', 'ready']).toContain(decryptOperation.status);

    // Step 6: Finalize decryption operation with encrypted data
    const decryptedOperation = await finalizeOperation(ACCESS_TOKEN, keyId, decryptOperationId, encryptedData);
    expect(decryptedOperation).toBeDefined();
    expect(decryptedOperation.operation.status).toBe('completed');

    // Step 7: Verify decrypted data matches original plain text
    const decryptedData = decryptedOperation.data;
    expect(decryptedData).toBeDefined();
    expect(typeof decryptedData).toBe('string');

    // Convert base64url back to string
    const base64 = decryptedData.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const decryptedBuffer = Buffer.from(base64 + padding, 'base64');
    const decryptedText = decryptedBuffer.toString('utf-8');

    expect(decryptedText).toBe(plainText);
  }, 120000);

  test('should create AES-256-GCM symmetric key, encrypt payload, wrap key with Goodkey, decrypt via API', async () => {
    const accessToken = process.env.API_ENCRYPT_ACCESS_TOKEN || process.env.API_SIGNING_ACCESS_TOKEN;
    const certificateId = process.env.TEST_ENCRYPT_CERTIFICATE_ID;

    if (!accessToken) {
      throw new Error('API_ENCRYPT_ACCESS_TOKEN or API_SIGNING_ACCESS_TOKEN is required. Set env or run: npm run prepare_env -- -t YOUR_TOKEN');
    }
    if (!certificateId) {
      throw new Error('TEST_ENCRYPT_CERTIFICATE_ID is required. Set env or run: npm run prepare_env -- -t YOUR_TOKEN');
    }

    const { organization } = await getTokenMetadata(accessToken);
    const certMeta = await getCertificateMetadata(accessToken, organization.id, certificateId);
    expect(certMeta).toBeDefined();
    const keyId = certMeta.key.id;

    const keyMeta = await getKeyMetadata(accessToken, keyId);
    const algorithm = keyMeta.algorithms?.[0];
    if (!algorithm) throw new Error('Key has no algorithms');

    const certPem = await downloadCertificate(accessToken, organization.id, certificateId);
    const cert = new X509Certificate(certPem);
    expect(cert).toBeDefined();

    const payload = 'Secret message protected by AES-256-GCM and Goodkey';

    const aesKey = createAes256GcmKey();
    expect(aesKey.length).toBe(32);

    const encryptedPayload = encryptWithAes256Gcm(aesKey, payload);
    const wrappedKey = await encryptKeyWithGoodkey(aesKey, cert, algorithm);
    const recoveredKey = await decryptKeyWithGoodkey(accessToken, keyId, algorithm, wrappedKey);
    const decryptedPayload = decryptWithAes256Gcm(recoveredKey, encryptedPayload);

    expect(decryptedPayload).toBe(payload);
  }, 120000);

  test('should wrap AES-256-GCM key with public key (not certificate), decrypt via API', async () => {
    const accessToken = process.env.API_ENCRYPT_ACCESS_TOKEN || process.env.API_SIGNING_ACCESS_TOKEN;
    const certificateId = process.env.TEST_ENCRYPT_CERTIFICATE_ID;

    if (!accessToken) {
      throw new Error('API_ENCRYPT_ACCESS_TOKEN or API_SIGNING_ACCESS_TOKEN is required. Set env or run: npm run prepare_env -- -t YOUR_TOKEN');
    }
    if (!certificateId) {
      throw new Error('TEST_ENCRYPT_CERTIFICATE_ID is required. Set env or run: npm run prepare_env -- -t YOUR_TOKEN');
    }

    const { organization } = await getTokenMetadata(accessToken);
    const certMeta = await getCertificateMetadata(accessToken, organization.id, certificateId);
    expect(certMeta).toBeDefined();
    const keyId = certMeta.key.id;

    const keyMeta = await getKeyMetadata(accessToken, keyId);
    const algorithm = keyMeta.algorithms?.[0];

    if (!algorithm) throw new Error('Key has no algorithms');

    const keyBlob = await getPublicKey(accessToken, keyId);
    console.log(keyBlob);
    const publicKeyPem = await keyBlob.text();
    expect(publicKeyPem.length).toBeGreaterThan(0);

    const payload = 'Secret encrypted with public key, not certificate';

    const aesKey = createAes256GcmKey();
    expect(aesKey.length).toBe(32);

    const encryptedPayload = encryptWithAes256Gcm(aesKey, payload);
    const wrappedKey = encryptKeyWithPublicKey(aesKey, publicKeyPem, algorithm);
    const recoveredKey = await decryptKeyWithGoodkey(accessToken, keyId, algorithm, wrappedKey);
    const decryptedPayload = decryptWithAes256Gcm(recoveredKey, encryptedPayload);

    expect(decryptedPayload).toBe(payload);
  }, 120000);
});
