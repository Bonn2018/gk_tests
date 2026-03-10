/**
 * API Operations Tests - Key deactivation
 *
 * 1) Create a key with two algorithms (signing and encryption)
 * 2) Create signing and decryption operations
 * 3) Deactivate the key via deactivate endpoint
 * 4) Finalize operations -> expect error
 * 5) Create new operation -> expect error
 */

import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import {
  getTokenMetadata,
  getProviders,
  getProvider,
  createKey,
  updateToken,
  createSignOperation,
  createDecryptOperation,
  finalizeOperation,
  deactivateKey,
  getKeyMetadata,
} from '../../api';
import { toBase64Url } from '../../utils';

const POPULAR_SIGNING_ALGORITHMS = [
  'RSASSA_PKCS1_2048_SHA256',
  'RSA_PSS_2048_SHA256',
  'RSA_PSS_4096_SHA384',
];

const POPULAR_ENCRYPT_ALGORITHMS = [
  'RSA_OAEP_2048_SHA256',
  'RSA_OAEP_2048_SHA1',
  'RSA_OAEP_3072_SHA256',
  'RSA_OAEP_3072_SHA1',
];

describe('API Operations - Key deactivation', () => {
  let accessToken: string;
  let keyId: string;
  let signAlgorithm: string;
  let encryptAlgorithm: string;
  let signOperationId: string;
  let decryptOperationId: string;

  test('deactivated key: finalize and new operations return error', async () => {
    const ACCESS_TOKEN = process.env.API_SIGNING_ACCESS_TOKEN;
    if (!ACCESS_TOKEN) {
      throw new Error(
        'API_SIGNING_ACCESS_TOKEN is required. Set env or run: npm run prepare_env -- -t YOUR_TOKEN'
      );
    }
    accessToken = ACCESS_TOKEN;

    const tokenMetadata = await getTokenMetadata(ACCESS_TOKEN);
    const organizationId = tokenMetadata.organization.id;
    const tokenId = tokenMetadata.id;
    const currentKeyIds = (tokenMetadata.keys || []).map((k: { id: string }) => k.id);
    const currentCertIds = (tokenMetadata.certificates || []).map((c: { id: string }) => c.id);

    // 1) Find provider with both signing and encryption algorithms
    const { items: providers } = await getProviders(ACCESS_TOKEN, organizationId);
    if (!providers?.length) {
      throw new Error('No providers found for organization');
    }

    let providerId: string | null = null;
    let chosenSignAlgo: string | null = null;
    let chosenEncryptAlgo: string | null = null;

    for (const p of providers) {
      const provider = await getProvider(ACCESS_TOKEN, organizationId, p.id);
      // Key has two algorithms: must use a provider that supports multi-algorithms
      if (provider.multiAlgorithms) {
        const algos = provider.algorithms || [];
        const hasSign = POPULAR_SIGNING_ALGORITHMS.find((a) => algos.includes(a));
        const hasEncrypt = POPULAR_ENCRYPT_ALGORITHMS.find((a) => algos.includes(a));
        if (hasSign && hasEncrypt) {
          providerId = provider.id;
          chosenSignAlgo = hasSign;
          chosenEncryptAlgo = hasEncrypt;
          break;
        }
      }
    }

    if (!providerId || !chosenSignAlgo || !chosenEncryptAlgo) {
      throw new Error(
        'No provider found with multiAlgorithms that supports both a popular signing and encryption algorithm'
      );
    }

    signAlgorithm = chosenSignAlgo;
    encryptAlgorithm = chosenEncryptAlgo;

    // Create key with two algorithms (signing and encryption)
    const keyName = `TEST_deactivate_key_${randomUUID()}`;
    const key = await createKey(ACCESS_TOKEN, {
      providerId,
      orgId: organizationId,
      name: keyName,
      algorithms: [chosenSignAlgo, chosenEncryptAlgo],
    });
    keyId = key.id;
    expect(keyId).toBeDefined();

    // Attach key to token so we can use it
    const keyIds = currentKeyIds.includes(keyId) ? currentKeyIds : [...currentKeyIds, keyId];
    await updateToken(ACCESS_TOKEN, organizationId, tokenId, {
      keys: keyIds,
      certificates: currentCertIds,
    });

    // Optional: ensure key metadata has both algorithms
    const keyMeta = await getKeyMetadata(ACCESS_TOKEN, keyId);
    expect(keyMeta.algorithms).toEqual(
      expect.arrayContaining([chosenSignAlgo, chosenEncryptAlgo])
    );

    // 2) Create signing and decryption operations
    const signOp = await createSignOperation(ACCESS_TOKEN, keyId, chosenSignAlgo);
    expect(signOp?.id).toBeDefined();
    signOperationId = signOp.id;

    const decryptOp = await createDecryptOperation(ACCESS_TOKEN, keyId, chosenEncryptAlgo);
    expect(decryptOp?.id).toBeDefined();
    decryptOperationId = decryptOp.id;

    // 3) Deactivate the key
    await deactivateKey(ACCESS_TOKEN, keyId);

    // 4) Finalize operations -> expect error
    const testData = 'test data for deactivation';
    const testHash = crypto.createHash('sha256').update(testData).digest('hex');
    const base64urlHash = toBase64Url(Buffer.from(testHash, 'hex'));

    let finalizeSignError: Error | null = null;
    try {
      await finalizeOperation(ACCESS_TOKEN, keyId, signOperationId, base64urlHash);
    } catch (e) {
      finalizeSignError = e as Error;
    }
    expect(finalizeSignError).not.toBeNull();
    expect(finalizeSignError!.message).toBeDefined();
    expect(finalizeSignError!.message.length).toBeGreaterThan(0);

    // Dummy ciphertext for decrypt finalize (we only check that finalize fails)
    const dummyCiphertext = toBase64Url(Buffer.from('dummy'));
    let finalizeDecryptError: Error | null = null;
    try {
      await finalizeOperation(ACCESS_TOKEN, keyId, decryptOperationId, dummyCiphertext);
    } catch (e) {
      finalizeDecryptError = e as Error;
    }
    expect(finalizeDecryptError).not.toBeNull();
    expect(finalizeDecryptError!.message).toBeDefined();

    // 5) Create new operation -> expect error
    let createOpError: Error | null = null;
    try {
      await createSignOperation(ACCESS_TOKEN, keyId, chosenSignAlgo);
    } catch (e) {
      createOpError = e as Error;
    }
    expect(createOpError).not.toBeNull();
    expect(createOpError!.message).toBeDefined();
  }, 120000);
});
