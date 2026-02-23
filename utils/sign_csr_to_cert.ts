/**
 * Utility: create a temporary CA (key + self-signed cert), sign a CSR with it,
 * return the signed X.509 certificate in PEM. The temporary key is never persisted.
 *
 * Use case: API can generate a CSR for an encryption key but not a self-signed cert;
 * this signs the CSR so the result can be imported via POST /key/{keyId}/certificate.
 */

import * as crypto from 'crypto';
import forge from 'node-forge';

export interface SignCsrResult {
  /** Signed X.509 certificate in PEM format */
  signedCertPem: string;
}

/**
 * @param csrPem - CSR in PEM format (e.g. from API). If the API returns CSR as base64url,
 * use Pkcs10CertificateRequest(apiData).toString('pem') to get PEM.
 * @param validityDays - Validity of the signed certificate in days (default 365)
 * @param options - skipVerification: if true, skip node-forge CSR verify (use when CSR was already verified e.g. via @peculiar/x509, e.g. RSA-PSS breaks node-forge verify)
 * @returns Signed certificate in PEM format
 */
export function signCsrWithTempCa(
  csrPem: string,
  validityDays: number = 365,
  options?: { skipVerification?: boolean }
): SignCsrResult {
  const csr = forge.pki.certificationRequestFromPem(csrPem);
  if (!options?.skipVerification && !csr.verify()) {
    throw new Error('CSR verification failed');
  }
  const csrPublicKey = csr.publicKey;
  if (!csrPublicKey) {
    throw new Error('CSR has no public key');
  }

  // Temporary CA key and self-signed cert (used only to sign the CSR)
  const caKeys = forge.pki.rsa.generateKeyPair(2048);
  const caCert = forge.pki.createCertificate();
  caCert.publicKey = caKeys.publicKey;
  caCert.serialNumber = '01' + crypto.randomBytes(19).toString('hex');
  caCert.validity.notBefore = new Date();
  caCert.validity.notAfter = new Date();
  caCert.validity.notAfter.setFullYear(caCert.validity.notAfter.getFullYear() + 1);
  const caAttrs = [
    { name: 'commonName', value: 'GK Tests Temp CA' },
    { name: 'organizationName', value: 'GoodKey Tests' },
  ];
  caCert.setSubject(caAttrs);
  caCert.setIssuer(caAttrs);
  caCert.setExtensions([
    {
      name: 'basicConstraints',
      cA: true,
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
    },
  ]);
  caCert.sign(caKeys.privateKey, forge.md.sha256.create());

  // Build certificate from CSR: subject and publicKey from CSR, issuer from CA
  const cert = forge.pki.createCertificate();
  cert.publicKey = csrPublicKey;
  cert.serialNumber = '02' + crypto.randomBytes(19).toString('hex');
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setDate(cert.validity.notAfter.getDate() + validityDays);
  cert.setSubject(csr.subject.attributes);
  cert.setIssuer(caCert.subject.attributes);
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: false,
    },
    {
      name: 'keyUsage',
      keyEncipherment: true,
      digitalSignature: true,
    },
  ]);
  cert.sign(caKeys.privateKey, forge.md.sha256.create());

  const signedCertPem = forge.pki.certificateToPem(cert);
  return { signedCertPem };
}
