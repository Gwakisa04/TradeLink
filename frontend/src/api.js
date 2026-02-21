const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export const TESTNET_EXPLORER_TX = 'https://stellar.expert/explorer/testnet/tx';

async function parseJsonOrThrow(res, fallbackError) {
  const text = await res.text();
  if (res.status === 404 && text.trim().startsWith('<')) {
    throw new Error('Backend not reachable (404). Start it with: cd backend && npm start');
  }
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    throw new Error(res.status === 404 ? 'Backend not reachable (404). Start the backend: cd backend && npm start' : fallbackError);
  }
  if (!res.ok) throw new Error(data.error || fallbackError);
  return data;
}

export async function createAccount() {
  const res = await fetch(`${API_BASE}/create-account`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  const data = await parseJsonOrThrow(res, 'Failed to create account');
  return data;
}

export async function verifyLogin(publicKey, secretKey) {
  const res = await fetch(`${API_BASE}/verify-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey: publicKey.trim(), secretKey: secretKey.trim() }),
  });
  const data = await parseJsonOrThrow(res, 'Login failed');
  return data;
}

export async function getAccount(publicKey) {
  const res = await fetch(`${API_BASE}/account/${encodeURIComponent(publicKey)}`);
  const data = await parseJsonOrThrow(res, 'Failed to load account');
  return data;
}

export async function addTrustline(body) {
  const res = await fetch(`${API_BASE}/add-trustline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJsonOrThrow(res, 'Failed to add trustline');
  return data;
}

export async function sendPayment(payload) {
  const res = await fetch(`${API_BASE}/send-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonOrThrow(res, 'Payment failed');
  return data;
}

export async function getMarketRates() {
  const res = await fetch(`${API_BASE}/market-rates`);
  const data = await parseJsonOrThrow(res, 'Failed to fetch market rates');
  return data.rates || [];
}

export async function getTzsIssuer() {
  const res = await fetch(`${API_BASE}/tzs-issuer`);
  const data = await parseJsonOrThrow(res, 'Failed to get TZS issuer');
  return data.tzsIssuer;
}

export async function issueTzs(destination, amount) {
  const res = await fetch(`${API_BASE}/issue-tzs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination, amount }),
  });
  const data = await parseJsonOrThrow(res, 'Failed to issue TZS');
  return data;
}
