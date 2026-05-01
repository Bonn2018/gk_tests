/**
 * prepare_env: create signing key, encryption key, and self-signed certs via API,
 * then merge results into env/.env.dev so tests can run with minimal setup.
 *
 * Usage: npm run prepare_env -- -t YOUR_TOKEN
 */
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import {
  getTokenMetadata,
  getProviders,
  getProvider,
  createKey,
  createSelfSignedCertificate,
  getKeyMetadata,
  getCertificateMetadata,
  createCSR,
  addKeyCertificate,
} from '../api';
import { parseTokenFromArgv, readEnvFile, appendEnv, addKeyToToken, addCertToToken } from './utils';
import { signCsrWithTempCa, toBase64Url } from '../utils';
import { Pkcs10CertificateRequest, X509Certificate } from '@peculiar/x509';
import path from 'path';

// Popular algorithms (from API def-92). First match with provider wins.
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


async function main(): Promise<void> {
  dotenv.config({ path: path.resolve(__dirname, '../env/.env.dev') });

  const accessToken = parseTokenFromArgv();
  if (!accessToken) {
    console.error('Usage: npm run prepare_env -- -t YOUR_TOKEN');
    process.exit(1);
  }
  const tokenStr: string = accessToken;

  // Load existing .env so API_BASE_URL is set when calling api
  const existing = readEnvFile();
  for (const [k, v] of Object.entries(existing)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }

  if (!process.env.API_BASE_URL) process.env.API_BASE_URL = 'https://api.goodkey.pp.ua/v0';

  let organizationId: string = '';
  let tokenId: string = '';
  let currentKeyIds: string[] = [];
  let currentCertIds: string[] = [];
  try {
    const meta = await getTokenMetadata(accessToken);

    if (!meta.id || !meta.organization?.id) {
      throw new Error('Token profile missing id or organization');
    }
    organizationId = meta.organization.id;
    tokenId = meta.id;
    currentKeyIds = (meta.keys || []).map((k) => k.id);
    currentCertIds = (meta.certificates || []).map((c) => (c as { id: string }).id);
  } catch (e) {
    console.error('Failed to get token profile:', (e as Error).message);
    process.exit(1);
  }
  if (!tokenId || !organizationId) {
    console.error('Token profile missing id or organization');
    process.exit(1);
  }
  const orgId: string = organizationId;
  const tokId: string = tokenId;

  // Write tokens and base URL first (incremental write)
  appendEnv({
    API_SIGNING_ACCESS_TOKEN: accessToken,
    API_ENCRYPT_ACCESS_TOKEN: accessToken,
    API_BASE_URL: process.env.API_BASE_URL || 'https://api.goodkey.pp.ua/v0',
  });

  const existingEnv = readEnvFile();
  const hasSigningKey = !!existingEnv.TEST_SIGNING_KEY_ID;
  const hasEncryptKey = !!existingEnv.TEST_ENCRYPT_KEY_ID;
  const hasSigningCert = !!existingEnv.TEST_SIGNING_CERTIFICATE_ID;
  const hasEncryptCert = !!existingEnv.TEST_ENCRYPT_CERTIFICATE_ID;

  if (hasSigningKey && hasEncryptKey && hasSigningCert && hasEncryptCert) {
    console.log('All keys and certificates already in env, nothing to create.');
    console.log('TEST_SIGNING_CERTIFICATE_ID=', existingEnv.TEST_SIGNING_CERTIFICATE_ID);
    console.log('TEST_ENCRYPT_CERTIFICATE_ID=', existingEnv.TEST_ENCRYPT_CERTIFICATE_ID);
    return;
  }

  let providerId: string | null = null;
  let chosenSigningAlgo: string | null = null;
  let chosenEncryptAlgo: string | null = null;

  const needKeys = !hasSigningKey || !hasEncryptKey;
  if (needKeys) {
    const { items: providers } = await getProviders(accessToken, organizationId);
    if (!providers?.length) {
      console.error('No providers found for organization');
      process.exit(1);
    }

    for (const p of providers) {
      const provider = await getProvider(accessToken, organizationId, p.id);
      const algos = provider.algorithms || [];
      const hasSign = POPULAR_SIGNING_ALGORITHMS.find((a) => algos.includes(a));
      const hasEncrypt = POPULAR_ENCRYPT_ALGORITHMS.find((a) => algos.includes(a));
      if (hasSign && hasEncrypt) {
        providerId = provider.id;
        chosenSigningAlgo = hasSign;
        chosenEncryptAlgo = hasEncrypt;
        break;
      }
    }

    if (!providerId || !chosenSigningAlgo || !chosenEncryptAlgo) {
      console.error('No provider found that supports both a popular signing and encryption algorithm');
      process.exit(1);
    }
  }

  // Signing key
  let signingKeyId: string;
  if (hasSigningKey) {
    signingKeyId = existingEnv.TEST_SIGNING_KEY_ID;
    console.log('Skipping signing key creation, TEST_SIGNING_KEY_ID already set.');
  } else {
    const signingKeyName = `TEST_signing_key_${randomUUID()}`;
    const signingKey = await createKey(accessToken, {
      providerId: providerId!,
      orgId: organizationId,
      name: signingKeyName,
      algorithms: [chosenSigningAlgo!],
    });
    signingKeyId = signingKey.id;
    appendEnv({ TEST_SIGNING_KEY_ID: signingKeyId });
    currentKeyIds = await addKeyToToken(tokenStr, orgId, tokId, currentKeyIds, currentCertIds, signingKeyId);
  }

  // Encryption key
  let encryptionKeyId: string;
  if (hasEncryptKey) {
    encryptionKeyId = existingEnv.TEST_ENCRYPT_KEY_ID;
    console.log('Skipping encryption key creation, TEST_ENCRYPT_KEY_ID already set.');
  } else {
    const encryptionKeyName = `TEST_encryption_key_${randomUUID()}`;
    const encryptionKey = await createKey(accessToken, {
      providerId: providerId!,
      orgId: organizationId,
      name: encryptionKeyName,
      algorithms: [chosenEncryptAlgo!],
    });
    encryptionKeyId = encryptionKey.id;
    appendEnv({ TEST_ENCRYPT_KEY_ID: encryptionKeyId });
    currentKeyIds = await addKeyToToken(tokenStr, orgId, tokId, currentKeyIds, currentCertIds, encryptionKeyId);
  }

  // Resolve signing algorithm for self_sign (needed for both certs)
  let signingAlgoForCert: string;
  if (chosenSigningAlgo) {
    signingAlgoForCert = chosenSigningAlgo;
  } else {
    const keyMeta = await getKeyMetadata(accessToken, signingKeyId);
    const first = keyMeta.algorithms?.[0];
    if (!first) {
      console.error('Signing key has no algorithms');
      process.exit(1);
    }
    signingAlgoForCert = first;
  }

  // Self-signed cert for signing key
  let signingCertId: string;
  if (hasSigningCert) {
    signingCertId = existingEnv.TEST_SIGNING_CERTIFICATE_ID;
    console.log('Skipping signing certificate creation, TEST_SIGNING_CERTIFICATE_ID already set.');
  } else {
    const signingCert = await createSelfSignedCertificate(accessToken, signingKeyId, {
      name: `TEST_signing_cert_${randomUUID()}`,
      algorithm: { type: 'sign', name: signingAlgoForCert },
      save: true,
    });
    signingCertId = signingCert.id;
    appendEnv({ TEST_SIGNING_CERTIFICATE_ID: signingCertId });
    currentCertIds = await addCertToToken(tokenStr, orgId, tokId, currentKeyIds, currentCertIds, signingCertId);
  }

  // Self-signed cert for encryption key
  let encryptionCertId: string;

  if (hasEncryptCert) {
    encryptionCertId = existingEnv.TEST_ENCRYPT_CERTIFICATE_ID;
    console.log('Skipping encryption certificate creation, TEST_ENCRYPT_CERTIFICATE_ID already set.');
  } else {
    const signingCert = await getCertificateMetadata(accessToken, organizationId, signingCertId);
    const keyMeta = await getKeyMetadata(accessToken, signingCert.key.id);
    const { data: CSR_DATA } = await createCSR(accessToken, encryptionKeyId, {
      name: `TEST_encryption_CSR_${randomUUID()}`,
      certificateId: signingCertId,
      algorithm: { type: 'sign', name: keyMeta.algorithms?.[0] },
    });
    const csr = new Pkcs10CertificateRequest(CSR_DATA);
    const csrPem = csr.toString('pem');
    const { signedCertPem } = signCsrWithTempCa(csrPem, 365, { skipVerification: true });
    const certificate = new X509Certificate(signedCertPem);
    const encryptionCert = await addKeyCertificate(accessToken, encryptionKeyId, {
      data: certificate.toString('pem'),
      type: 'x509',
      name: `TEST_encryption_cert_${randomUUID()}`,
    });

    encryptionCertId = encryptionCert.id;
    appendEnv({ TEST_ENCRYPT_CERTIFICATE_ID: encryptionCertId });
    currentCertIds = await addCertToToken(tokenStr, orgId, tokId, currentKeyIds, currentCertIds, encryptionCertId);
  }

  console.log('prepare_env done. env/.env.dev updated.');
  console.log('TEST_SIGNING_CERTIFICATE_ID=', signingCertId);
  console.log('TEST_ENCRYPT_CERTIFICATE_ID=', encryptionCertId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
