/**
 * API Operations Tests - Invalid Signing
 * 
 * Tests for error handling when creating and finalizing signing operations
 * This test intentionally provokes errors to verify proper error handling
 */

import * as crypto from 'crypto';
import { X509Certificate } from '@peculiar/x509';
import {
  getTokenMetadata,
  getCertificateMetadata,
  downloadCertificate,
  createSignOperation,
  finalizeOperation,
} from '../../api';
import { toBase64Url } from '../../utils';

describe('API Operations - Invalid Signing', () => {
  // Test data
  let keyId: string;
  let testData: string;

  test('should fail when finalizing operation with raw data instead of hash', async () => {
    const ALGORITHM = 'RSASSA_PKCS1_2048_SHA256';
    const ACCESS_TOKEN = process.env.API_SIGNING_ACCESS_TOKEN;
    const CERTIFICATE_ID = process.env.TEST_CERTIFICATE_ID;

    // Skip test if required environment variables are not provided
    if (!ACCESS_TOKEN) {
      console.warn('API_SIGNING_ACCESS_TOKEN not set, skipping test');
      return;
    }
    if (!CERTIFICATE_ID) {
      console.warn('TEST_CERTIFICATE_ID not set, skipping test');
      return;
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
    
    // Step 2: Prepare test data (raw, not hashed)
    testData = 'test data for signing';
    const testDataBuffer = Buffer.from(testData);

    // Step 3: Create signing operation
    const operation = await createSignOperation(ACCESS_TOKEN, keyId, ALGORITHM);
  
    expect(operation).toBeDefined();
  
    const operationId = operation.id;

    // Verify operation was created with correct status
    expect(['pending', 'ready']).toContain(operation.status);

    // Step 4: Try to finalize operation with raw data instead of hash
    // This should fail because the API expects a hash, not raw data
    const base64urlRawData = toBase64Url(testDataBuffer);

    await expect(
      finalizeOperation(ACCESS_TOKEN, keyId, operationId, base64urlRawData)
    ).rejects.toThrow();

    // Verify that the error message contains relevant information
    try {
      await finalizeOperation(ACCESS_TOKEN, keyId, operationId, base64urlRawData);
    } catch (error: any) {
      expect(error.message).toBeDefined();
      expect(typeof error.message).toBe('string');
      // Error should mention the endpoint and method
      expect(error.message).toContain('PATCH');
      expect(error.message).toContain('/finalize');
    }
  }, 120000);
});
