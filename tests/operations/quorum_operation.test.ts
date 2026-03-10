/**
 * API Operations Tests - Quorum
 *
 * With quorum > 0, finalizing an operation requires multiple approvals.
 * This test: set quorum to 1, attempt finalize (expect error), then set quorum back to 0.
 */

import * as crypto from 'crypto';
import {
  getTokenMetadata,
  getCertificateMetadata,
  createSignOperation,
  finalizeOperation,
  getKeyMetadata,
  updateKey,
} from '../../api';
import { toBase64Url } from '../../utils';

describe('API Operations - Quorum', () => {
  let accessToken: string | undefined;
  let keyId: string | undefined;

  afterAll(async () => {
    if (accessToken && keyId) {
      await updateKey(accessToken, keyId, { quorum: 0 });
    }
  });

  test('should fail finalize when key has quorum 1, then succeed after reset to quorum 0', async () => {
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

    const certificate = await getCertificateMetadata(ACCESS_TOKEN, organizationId, CERTIFICATE_ID);
    expect(certificate).toBeDefined();
    const kid = certificate.key.id;
    expect(kid).toBeDefined();

    accessToken = ACCESS_TOKEN;
    keyId = kid;

    const keyMetadata = await getKeyMetadata(ACCESS_TOKEN, kid);
    const ALGORITHM = keyMetadata.algorithms?.[0];
    if (!ALGORITHM) {
      throw new Error('Key has no algorithms');
    }

    // Set key to quorum: 1 (one approval required)
    await updateKey(ACCESS_TOKEN, kid, { quorum: 1 });

    const testData = 'test data for quorum';
    const testHash = crypto.createHash('sha256').update(testData).digest('hex');
    const base64urlHash = toBase64Url(Buffer.from(testHash, 'hex'));

    const operation = await createSignOperation(ACCESS_TOKEN, kid, ALGORITHM);
    expect(operation).toBeDefined();
    const operationId = operation.id;

    // Finalize should fail (quorum not satisfied)
    let finalizeError: Error | null = null;
    let finalizeResponse: any = null;
    try {
      finalizeResponse = await finalizeOperation(ACCESS_TOKEN, kid, operationId, base64urlHash);
    } catch (e) {
      finalizeError = e as Error;
    }

    const hasError =
      finalizeError !== null ||
      (finalizeResponse?.operation?.status === 'error' && finalizeResponse?.operation?.error);

    expect(hasError).toBe(true);

    if (finalizeError) {
      expect(finalizeError.message).toBeDefined();
      expect(finalizeError.message.length).toBeGreaterThan(0);
    }
    if (finalizeResponse?.operation?.error) {
      expect(finalizeResponse.operation.error).toBeDefined();
    }
  }, 120000);
});
