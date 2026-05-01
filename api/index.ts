/**
 * API client functions for GoodKey API
 */

/**
 * Helper function to make authenticated API requests
 */
async function makeApiRequest(
  token: string,
  method: string,
  endpoint: string,
  body?: any
): Promise<Response> {
  const url = `${process.env.API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (${method} ${endpoint}): ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response;
}

/**
 * Get token metadata (GET /token/profile). Returns profile def-81 with id, organization, keys, certificates.
 */
export async function getTokenMetadata(token: string) {
  const response = await makeApiRequest(token, 'GET', `/token/profile`);
  return await response.json() as {
    id: string;
    organization: { id: string };
    keys: { id: string }[];
    certificates: { id: string }[];
  };
}

/**
 * Update access token (PUT /organization/{organizationId}/token/{tokenId}).
 * Body def-86: keys, certificates (full lists; merge with existing before sending), name, description optional.
 */
export async function updateToken(
  token: string,
  organizationId: string,
  tokenId: string,
  body: { keys?: string[]; certificates?: string[]; name?: string; description?: string }
): Promise<unknown> {
  const response = await makeApiRequest(
    token,
    'PUT',
    `/organization/${organizationId}/token/${tokenId}`,
    body
  );
  return await response.json();
}

/**
 * Regenerate access token (POST /organization/{organizationId}/token/{tokenId}/regenerate).
 * Body def-87 (expiresAt optional), response def-80. Returns the new token value.
 */
export async function regenerateToken(
  token: string,
  organizationId: string,
  tokenId: string,
  body?: { expiresAt?: string }
): Promise<{ value: string }> {
  const response = await makeApiRequest(
    token,
    'POST',
    `/organization/${organizationId}/token/${tokenId}/regenerate`,
    body ?? {}
  );
  return (await response.json()) as { value: string };
}

/**
 * Get certificate metadata
 */
export async function getCertificateMetadata(
  token: string,
  organizationId: string,
  certificateId: string
): Promise<any> {
  const response = await makeApiRequest(
    token,
    'GET',
    `/organization/${organizationId}/certificate/${certificateId}`
  );
  return await response.json();
}

export async function getPublicKey(token: string, keyId: string): Promise<any> {
  const response = await makeApiRequest(
    token,
    'GET',
    `/key/${keyId}/public`
  );
  return await response.blob();
}

/**
 * Download certificate file
 */
export async function downloadCertificate(
  token: string,
  organizationId: string,
  certificateId: string
): Promise<Buffer> {
  const response = await makeApiRequest(
    token,
    'GET',
    `/organization/${organizationId}/certificate/${certificateId}/download`
  );

  const base64urlData = await response.json().then((res: any) => res.data);
  return Buffer.from(base64urlData, 'base64url');
}

/**
 * Create a signing operation
 */
export async function createSignOperation(
  token: string,
  keyId: string,
  algorithmName: string
): Promise<any> {
  const response = await makeApiRequest(
    token,
    'POST',
    `/key/${keyId}/operation`,
    {
      type: 'sign',
      name: algorithmName,
    }
  );
  return await response.json();
}

/**
 * Create a decryption operation
 */
export async function createDecryptOperation(
  token: string,
  keyId: string,
  algorithmName: string
): Promise<any> {
  const response = await makeApiRequest(
    token,
    'POST',
    `/key/${keyId}/operation`,
    {
      type: 'decrypt',
      name: algorithmName,
    }
  );
  return await response.json();
}

/**
 * Finalize an operation with data
 */
export async function finalizeOperation(
  token: string,
  keyId: string,
  operationId: string,
  data: string
): Promise<any> {
  const response = await makeApiRequest(
    token,
    'PATCH',
    `/key/${keyId}/operation/${operationId}/finalize`,
    {
      data: data, // Base64url-encoded data
    }
  );
  return await response.json();
}

export async function getKeyMetadata(
  token: string,
  keyId: string
): Promise<any> {
  const response = await makeApiRequest(
    token,
    'GET',
    `/key/${keyId}`
  );
  return await response.json();
}

/**
 * Update key (PATCH /key/{keyId}). Body can include quorum (number of approvals required).
 */
export async function updateKey(
  token: string,
  keyId: string,
  body: { quorum?: number }
): Promise<any> {
  const response = await makeApiRequest(
    token,
    'PUT',
    `/key/${keyId}`,
    body
  );
  return await response.json();
}

/**
 * Deactivate a key. After deactivation, operations cannot be created or finalized.
 * Uses POST /key/{keyId}/deactivate (common REST pattern; if API differs, adjust endpoint).
 */
export async function deactivateKey(token: string, keyId: string): Promise<any> {
  const response = await makeApiRequest(
    token,
    'PATCH',
    `/key/${keyId}/deactivate`,
    {}
  );
  return await response.json();
}

/** Provider list item (id, name, etc.) */
export type ProviderListItem = { id: string; name?: string };

/** List of organization providers (def-90) */
export async function getProviders(
  token: string,
  organizationId: string
): Promise<{ items: ProviderListItem[] }> {
  const response = await makeApiRequest(
    token,
    'GET',
    `/organization/${organizationId}/providers`
  );
  return (await response.json()) as { items: ProviderListItem[] };
}

/** Full provider with algorithms (def-93) */
export async function getProvider(
  token: string,
  organizationId: string,
  providerId: string
): Promise<{ id: string; algorithms: string[], multiAlgorithms: boolean }> {
  const response = await makeApiRequest(
    token,
    'GET',
    `/organization/${organizationId}/provider/${providerId}`
  );
  return (await response.json()) as { id: string; algorithms: string[]; multiAlgorithms: boolean };
}

/** Create key (POST /key, body def-100). Returns key with id (def-101). */
export async function createKey(
  token: string,
  body: { providerId: string; orgId: string; name: string; algorithms: string[] }
): Promise<{ id: string; algorithms?: string[] }> {
  const response = await makeApiRequest(token, 'POST', '/key', body);
  return (await response.json()) as { id: string; algorithms?: string[] };
}

/** Create self-signed certificate (POST /key/{keyId}/certificate/self_sign). Body def-149, response def-150. */
export async function createSelfSignedCertificate(
  token: string,
  keyId: string,
  body: { name?: string; algorithm?: { type: string; name: string }, save?: boolean }
): Promise<{ id: string }> {
  const response = await makeApiRequest(
    token,
    'POST',
    `/key/${keyId}/certificate/self_sign`,
    body
  );
  return (await response.json()) as { id: string };
}

/** Create a CSR (POST /key/{keyId}/csr). Body def-147, response def-148. */
export async function createCSR(
  token: string,
  keyId: string,
  body: { name?: string; certificateId?: string; algorithm?: { type: string; name: string }, save?: boolean }
): Promise<{ id: string; data: string }> {
  const response = await makeApiRequest(
    token,
    'POST',
    `/key/${keyId}/csr`,
    body
  );

  return (await response.json()) as { id: string; data: string };
}

/**
 * Add (import) a certificate to a key. Use for importing a cert signed from a CSR.
 * POST /key/{keyId}/certificate, body def-143: data (base64url cert), type 'x509', name optional.
 */
export async function addKeyCertificate(
  token: string,
  keyId: string,
  body: { data: string; type: 'x509'; name?: string }
): Promise<{ id: string }> {
  const response = await makeApiRequest(
    token,
    'POST',
    `/key/${keyId}/certificate`,
    body
  );
  return (await response.json()) as { id: string };
}

export async function registerAuthentificator(
  token: string,
  organizationId: string,
  body: {
    productId: string;
    serialNumber: string;
    label: string;
    credentials: {
      profileType: string;
      type: string;
      value: string;
    }[];
    firmware: string;
    profilesData: {
      [key: string]: {
        info: {
          status: string;
        };
        objects?: any[];
      };
    };
  }
): Promise<{ id: string }> {
  const response = await makeApiRequest(token, 'POST', `/organization/${organizationId}/authenticators/register`, body);
  return (await response.json()) as { id: string };
}
