/**
 * API Operations Tests - Encryption/Decryption
 * 
 * Tests for encrypting data locally and decrypting via API
 */

import { X509Certificate } from '@peculiar/x509';
import {
  getTokenMetadata,
  getCertificateMetadata,
  downloadCertificate,
  createDecryptOperation,
  finalizeOperation,
  getKeyMetadata,
} from '../../api';
import { encryptDataLocally } from '../../utils';

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
});
