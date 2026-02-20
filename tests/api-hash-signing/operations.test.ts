/**
 * API Operations Tests - Hash Signing
 * 
 * Tests for creating and finalizing operations using GoodKey API
 * - GET /certificate/{certificateId} - get certificate metadata
 * - POST /key/{keyId}/operation - create operation
 * - PATCH /key/{keyId}/operation/{operationId}/finalize - finalize operation
 */

import * as crypto from 'crypto';
import { X509Certificate } from '@peculiar/x509';

describe('API Operations - Hash Signing', () => {
  // Configuration from environment variables
  const API_BASE_URL = process.env.API_BASE_URL || 'https://api.goodkey.pp.ua';
  const ACCESS_TOKEN = process.env.API_SIGNING_ACCESS_TOKEN;
  const CERTIFICATE_ID = process.env.TEST_CERTIFICATE_ID || '4c3b03f4-a301-434e-9e9a-f051059f4215';
  const ALGORITHM = 'RSASSA_PKCS1_2048_SHA256';

  // Test data
  let keyId: string;
  let testData: string;
  let testHash: string;

  /**
   * Helper function to make authenticated API requests
   */
  async function makeApiRequest(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<Response> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    return response;
  }

  /**
   * Get certificate metadata
   */
  async function getCertificateMetadata(organizationId: string, certificateId: string): Promise<any> {
    const response = await makeApiRequest('GET', `/organization/${organizationId}/certificate/${certificateId}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get certificate metadata: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Get token metadata
   */
  async function getTokenMetadata() {
    const response = await makeApiRequest('GET', `/token/profile`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get token metadata: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json() as { organization: { id: string } };
  }

  /**
   * Download certificate file
   */
  async function downloadCertificate(organizationId: string, certificateId: string): Promise<Buffer> {

    const response = await makeApiRequest('GET', `/organization/${organizationId}/certificate/${certificateId}/download`);
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to download certificate: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const base64urlData = await response.json().then((res: any) => res.data);
  
    return Buffer.from(base64urlData, 'base64url');
  }

  /**
   * Verify signature using certificate directly
   * Uses Node.js crypto which supports verification with certificate
   */
  async function verifySignatureWithCertificate(
    data: Buffer,
    signature: string,
    cert: X509Certificate,
    algorithm: string
  ) {
    try {
      // Convert base64url signature to buffer
      const signatureBuffer = fromBase64Url(signature);

      // Determine hash algorithm from algorithm name
      let hashAlgorithm = 'sha256';
      if (algorithm.includes('SHA1')) {
        hashAlgorithm = 'sha1';
      } else if (algorithm.includes('SHA384')) {
        hashAlgorithm = 'sha384';
      } else if (algorithm.includes('SHA512')) {
        hashAlgorithm = 'sha512';
      }

      // Create verifier and verify with certificate directly
      // Node.js crypto.createVerify().verify() can accept a certificate
      const verify = crypto.createVerify(hashAlgorithm.toUpperCase());
      verify.update(data);
      verify.end();

      const publicKey = await cert.publicKey.export();

      return verify.verify(publicKey as any, signatureBuffer);
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Create a signing operation
   * @param keyId - Key ID from certificate metadata
   * @param algorithmName - Algorithm identifier (e.g., ECDSA_P256_SHA256, RSASSA_PKCS1_2048_SHA256)
   */
  async function createSignOperation(
    keyId: string,
    algorithmName: string
  ): Promise<any> {
    const response = await makeApiRequest(
      'POST',
      `/key/${keyId}/operation`,
      {
        type: 'sign',
        name: algorithmName,
        // expirationDate is optional
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create operation: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Finalize an operation with data
   * @param keyId - Key ID
   * @param operationId - Operation ID
   * @param data - Base64url-encoded data to finalize operation
   */
  async function finalizeOperation(
    keyId: string,
    operationId: string,
    data: string
  ): Promise<any> {
    const response = await makeApiRequest(
      'PATCH',
      `/key/${keyId}/operation/${operationId}/finalize`,
      {
        data: data, // Base64url-encoded data
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to finalize operation: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Convert buffer to base64url encoding
   */
  function toBase64Url(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Convert base64url to buffer
   */
  function fromBase64Url(base64url: string): Buffer {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    return Buffer.from(base64 + padding, 'base64');
  }


  test('should get certificate metadata, create signing operation, finalize and verify signature', async () => {
    // Skip test if required environment variables are not provided
    if (!ACCESS_TOKEN) {
      console.warn('ACCESS_TOKEN not set, skipping test');
      return;
    }
    if (!CERTIFICATE_ID) {
      console.warn('TEST_CERTIFICATE_ID not set, skipping test');
      return;
    }

    const tokenMetadata = await getTokenMetadata();
    const organizationId = tokenMetadata.organization.id;

    // Step 1: Get certificate metadata
    const certificate = await getCertificateMetadata(organizationId, CERTIFICATE_ID);

    expect(certificate).toBeDefined();
    expect(certificate.id).toBe(CERTIFICATE_ID);

    // Extract key ID from certificate metadata
    keyId = certificate.key.id;

    expect(keyId).toBeDefined();
    
    // Step 2: Prepare test data and hash
    testData = 'test data for signing';
    testHash = crypto.createHash('sha256').update(testData).digest('hex');
    const testDataBuffer = Buffer.from(testData);

    // Step 3: Create signing operation
    const operation = await createSignOperation(keyId, ALGORITHM);
  
    expect(operation).toBeDefined();
  
    const operationId = operation.id;

    // Verify operation was created with correct status
    expect(['pending', 'ready']).toContain(operation.status);

    // Step 4: Finalize operation with base64url-encoded hash
    const base64urlHash = toBase64Url(Buffer.from(testHash, 'hex'));
    const finalizedOperation = await finalizeOperation(keyId, operationId, base64urlHash);
    
    expect(finalizedOperation).toBeDefined();

    expect(finalizedOperation.operation.status).toBe('completed');

    // Step 5: Download certificate
    const certificateBuffer = await downloadCertificate(organizationId, CERTIFICATE_ID);
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

describe('API Operations - Encryption/Decryption', () => {
  // Configuration from environment variables
  const API_BASE_URL = process.env.API_BASE_URL || 'https://api.goodkey.pp.ua';
  const ACCESS_TOKEN = process.env.API_ENCRYPT_ACCESS_TOKEN;
  const CERTIFICATE_ID = process.env.TEST_ENCRYPT_CERTIFICATE_ID || 'b15a7390-0ae5-48ca-9a0a-5fa067d1d126';
  const ENCRYPT_ALGORITHM = 'RSA_OAEP_2048_SHA256'; // Simple RSA encryption algorithm

  // Test data
  let keyId: string;
  const plainText = 'Hello, this is a test message for encryption!';

  /**
   * Helper function to make authenticated API requests
   */
  async function makeApiRequest(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<Response> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    return response;
  }

  /**
   * Get token metadata
   */
  async function getTokenMetadata() {
    const response = await makeApiRequest('GET', `/token/profile`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get token metadata: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json() as { organization: { id: string } };
  }

  /**
   * Get certificate metadata
   */
  async function getCertificateMetadata(organizationId: string, certificateId: string): Promise<any> {
    const response = await makeApiRequest('GET', `/organization/${organizationId}/certificate/${certificateId}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get certificate metadata: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Download certificate file
   */
  async function downloadCertificate(organizationId: string, certificateId: string): Promise<Buffer> {
    const response = await makeApiRequest('GET', `/organization/${organizationId}/certificate/${certificateId}/download`);
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to download certificate: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const base64urlData = await response.json().then((res: any) => res.data);
  
    return Buffer.from(base64urlData, 'base64url');
  }

  /**
   * Encrypt data locally using certificate's public key
   */
  async function encryptDataLocally(
    data: Buffer,
    cert: X509Certificate,
    algorithm: string
  ): Promise<string> {
    try {
      // Determine encryption algorithm parameters from algorithm name
      // RSA_OAEP_2048_SHA256 means RSA-OAEP with SHA-256
      let hashAlgorithm = 'sha256';
      if (algorithm.includes('SHA1')) {
        hashAlgorithm = 'sha1';
      } else if (algorithm.includes('SHA384')) {
        hashAlgorithm = 'sha384';
      } else if (algorithm.includes('SHA512')) {
        hashAlgorithm = 'sha512';
      }

      // Get public key from certificate instance
      const publicKey = await cert.publicKey.export();

      // Encrypt using RSA-OAEP
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey as any,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: hashAlgorithm,
        },
        data
      );

      // Convert to base64url
      return toBase64Url(encrypted);
    } catch (error) {
      throw new Error(`Failed to encrypt data locally: ${error}`);
    }
  }

  /**
   * Create a decryption operation
   */
  async function createDecryptOperation(
    keyId: string,
    algorithmName: string
  ): Promise<any> {
    const response = await makeApiRequest(
      'POST',
      `/key/${keyId}/operation`,
      {
        type: 'decrypt',
        name: algorithmName,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create decryption operation: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Finalize an operation with data
   */
  async function finalizeOperation(
    keyId: string,
    operationId: string,
    data: string
  ): Promise<any> {
    const response = await makeApiRequest(
      'PATCH',
      `/key/${keyId}/operation/${operationId}/finalize`,
      {
        data: data, // Base64url-encoded data
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to finalize operation: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Convert buffer to base64url encoding
   */
  function toBase64Url(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  test('should encrypt data locally and decrypt via API', async () => {
    // Skip test if required environment variables are not provided
    if (!ACCESS_TOKEN) {
      console.warn('API_ENCRYPT_ACCESS_TOKEN or API_SIGNING_ACCESS_TOKEN not set, skipping test');
      return;
    }
    if (!CERTIFICATE_ID || CERTIFICATE_ID === 'placeholder-certificate-id-for-encryption') {
      console.warn('TEST_ENCRYPT_CERTIFICATE_ID not set, skipping test');
      return;
    }

    // Step 1: Get organization ID
    const tokenMetadata = await getTokenMetadata();
    const organizationId = tokenMetadata.organization.id;

    // Step 2: Get certificate metadata
    const certificate = await getCertificateMetadata(organizationId, CERTIFICATE_ID);
    expect(certificate).toBeDefined();
    keyId = certificate.key.id;
    expect(keyId).toBeDefined();

    // Step 3: Download certificate
    const certificateBuffer = await downloadCertificate(organizationId, CERTIFICATE_ID);
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
    const decryptOperation = await createDecryptOperation(keyId, ENCRYPT_ALGORITHM);
    expect(decryptOperation).toBeDefined();
    expect(decryptOperation.id).toBeDefined();
    const decryptOperationId = decryptOperation.id;
    expect(['pending', 'ready']).toContain(decryptOperation.status);

    // Step 6: Finalize decryption operation with encrypted data
    const decryptedOperation = await finalizeOperation(keyId, decryptOperationId, encryptedData);
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

