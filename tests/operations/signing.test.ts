/**
 * API Operations Tests - Hash Signing
 * 
 * Tests for creating and finalizing signing operations using GoodKey API
 */

import * as crypto from 'crypto';
import { X509Certificate } from '@peculiar/x509';
import {
  getTokenMetadata,
  getCertificateMetadata,
  downloadCertificate,
  createSignOperation,
  finalizeOperation,
  getKeyMetadata,
} from '../../api';
import { toBase64Url, verifySignatureWithCertificate } from '../../utils';

describe('API Operations - Hash Signing', () => {
  // Test data
  let keyId: string;
  let testData: string;
  let testHash: string;

  test('should get certificate metadata, create signing operation, finalize and verify signature', async () => {
    const ACCESS_TOKEN = process.env.API_SIGNING_ACCESS_TOKEN;
    const CERTIFICATE_ID = process.env.TEST_SIGNING_CERTIFICATE_ID;

    if (!ACCESS_TOKEN) {
      throw new Error('API_SIGNING_ACCESS_TOKEN is required. Set env or run: npm run prepare_env -- -t YOUR_TOKEN');
    }
    if (!CERTIFICATE_ID) {
      throw new Error('TEST_SIGNING_CERTIFICATE_ID is required. Set env or run: npm run prepare_env -- -t YOUR_TOKEN');
    }

    const tokenMetadata = await getTokenMetadata(ACCESS_TOKEN);
    const organizationId = tokenMetadata.organization.id;

    // Step 1: Get certificate metadata
    const certificate = await getCertificateMetadata(ACCESS_TOKEN, organizationId, CERTIFICATE_ID);

    expect(certificate).toBeDefined();
    expect(certificate.id).toBe(CERTIFICATE_ID);

    // Extract key ID from certificate metadata
    keyId = certificate.key.id;

    expect(keyId).toBeDefined();

    // Get algorithm from key metadata (same as invalid_signing flow)
    const keyMetadata = await getKeyMetadata(ACCESS_TOKEN, keyId);
    const ALGORITHM = keyMetadata.algorithms?.[0];
    if (!ALGORITHM) {
      throw new Error('Key has no algorithms');
    }
    
    // Step 2: Prepare test data and hash
    testData = 'test data for signing';
    testHash = crypto.createHash('sha256').update(testData).digest('hex');
    const testDataBuffer = Buffer.from(testData);

    // Step 3: Create signing operation
    const operation = await createSignOperation(ACCESS_TOKEN, keyId, ALGORITHM);
  
    expect(operation).toBeDefined();
  
    const operationId = operation.id;

    // Verify operation was created with correct status
    expect(['pending', 'ready']).toContain(operation.status);

    // Step 4: Finalize operation with base64url-encoded hash
    const base64urlHash = toBase64Url(Buffer.from(testHash, 'hex'));
    const finalizedOperation = await finalizeOperation(ACCESS_TOKEN, keyId, operationId, base64urlHash);
    
    expect(finalizedOperation).toBeDefined();

    expect(finalizedOperation.operation.status).toBe('completed');

    // Step 5: Download certificate
    const certificateBuffer = await downloadCertificate(ACCESS_TOKEN, organizationId, CERTIFICATE_ID);
    expect(certificateBuffer).toBeDefined();
    expect(certificateBuffer.length).toBeGreaterThan(0);

    // Verify certificate format using @peculiar/x509
    const cert = new X509Certificate(certificateBuffer);
    expect(cert).toBeDefined();

    // Step 6: Verify signature using certificate directly
    const signature = finalizedOperation.data;
    expect(signature).toBeDefined();

    // Verify signature using certificate directly
    const isValid = await verifySignatureWithCertificate(
      testDataBuffer,
      signature,
      cert,
      ALGORITHM
    );

    expect(isValid).toBeTruthy();
  }, 120000);
});
