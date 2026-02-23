/**
 * API client functions for GoodKey API
 */

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.goodkey.pp.ua';

/**
 * Helper function to make authenticated API requests
 */
async function makeApiRequest(
  token: string,
  method: string,
  endpoint: string,
  body?: any
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
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
 * Get token metadata
 */
export async function getTokenMetadata(token: string) {
  const response = await makeApiRequest(token, 'GET', `/token/profile`);
  return await response.json() as { organization: { id: string } };
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
