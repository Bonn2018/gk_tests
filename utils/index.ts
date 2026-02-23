/**
 * Utility functions for encoding/decoding and crypto operations
 */

import * as crypto from 'crypto';
import { X509Certificate } from '@peculiar/x509';

export { signCsrWithTempCa } from './sign_csr_to_cert';
export type { SignCsrResult } from './sign_csr_to_cert';

/**
 * Convert buffer to base64url encoding
 */
export function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Convert base64url to buffer
 */
export function fromBase64Url(base64url: string): Buffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(base64 + padding, 'base64');
}

/**
 * Verify signature using certificate directly
 * Uses Node.js crypto which supports verification with certificate
 */
export async function verifySignatureWithCertificate(
  data: Buffer,
  signature: string,
  cert: X509Certificate,
  algorithm: string
): Promise<boolean> {
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
 * Encrypt data locally using certificate's public key
 */
export async function encryptDataLocally(
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
