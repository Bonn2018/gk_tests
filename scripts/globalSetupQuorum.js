/**
 * Jest globalSetup: runs once before any test suite.
 * Resets signing key quorum to 0 so a previous failed run doesn't leave the key in quorum: 1.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../env/.env.dev') });

const API_BASE = process.env.API_BASE_URL || 'https://api-dev.goodkey.pp.ua/v0';

async function apiRequest(token, method, endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Reset possible test data
module.exports = async function globalSetup() {
  const token = process.env.API_SIGNING_ACCESS_TOKEN;
  const certId = process.env.TEST_SIGNING_CERTIFICATE_ID;

  if (!token || !certId) return;

  // Reset quorum to 0
  try {
    const meta = await apiRequest(token, 'GET', '/token/profile');
    const cert = await apiRequest(token, 'GET', `/organization/${meta.organization.id}/certificate/${certId}`);
    const kid = cert?.key?.id;
    if (kid) await apiRequest(token, 'PATCH', `/key/${kid}`, { quorum: 0 });
  } catch (_) {
    // env not configured or API error — skip
  }
};
