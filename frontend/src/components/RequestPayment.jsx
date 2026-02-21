import { useState, useCallback, useEffect } from 'react';
import KeyField from './KeyField';

// Generate QR as image URL without npm package (public API)
function getQRCodeDataUrl(payload) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(payload)}`;
}

const ASSET_OPTIONS = ['XLM', 'USDC', 'TZS'];

/** Payload encoded in the QR for "request payment" */
export function encodeRequestPayload({ publicKey, asset, amount }) {
  return JSON.stringify({ publicKey: publicKey.trim(), asset, amount: String(amount).trim() });
}

/** Normalize so we always have publicKey; asset and amount optional */
function normalizePayload(data) {
  const pk = data?.publicKey ?? data?.accountId ?? data?.account;
  const publicKey = typeof pk === 'string' ? pk.trim() : '';
  if (!publicKey || publicKey.length < 10) return null;
  const asset = data?.asset != null ? String(data.asset).trim() : '';
  const amount = data?.amount != null ? String(data.amount).trim() : '';
  return { publicKey, asset: asset || 'XLM', amount };
}

export function decodeRequestPayload(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  // Bare Stellar public key (G...)
  if (trimmed.startsWith('G') && trimmed.length >= 56 && /^G[A-Z2-7]+$/.test(trimmed)) {
    return { publicKey: trimmed, asset: 'XLM', amount: '' };
  }
  try {
    const data = JSON.parse(trimmed);
    return normalizePayload(data);
  } catch (_) {}
  return null;
}

export default function RequestPayment({ currentAccountPublicKey, onNavigate }) {
  const [publicKey, setPublicKey] = useState(currentAccountPublicKey || '');
  const [asset, setAsset] = useState('TZS');
  const [amount, setAmount] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentAccountPublicKey) setPublicKey(currentAccountPublicKey);
  }, [currentAccountPublicKey]);

  const createQr = useCallback(() => {
    setError('');
    const pk = publicKey.trim();
    const amt = amount.trim();
    if (!pk) {
      setError('Enter your Account ID (public key).');
      return;
    }
    if (!amt || isNaN(parseFloat(amt)) || parseFloat(amt) <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    const payload = encodeRequestPayload({ publicKey: pk, asset, amount: amt });
    setQrDataUrl(getQRCodeDataUrl(payload));
  }, [publicKey, asset, amount]);

  return (
    <section className="section request-payment-page">
      <h2>Request payment</h2>
      <p className="panel-hint">
        Choose the token type and amount you want to receive. Create a QR code and share it—the sender can scan it to autofill your details and send.
      </p>

      <div className="request-payment-form card-panel">
        <KeyField
          label="Your Account ID (public key) — who receives"
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          placeholder="G..."
          required
        />
        <div className="form-row">
          <label>Token type to receive</label>
          <select value={asset} onChange={(e) => setAsset(e.target.value)}>
            {ASSET_OPTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label>Amount to request</label>
          <input
            type="text"
            placeholder="e.g. 100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn-primary" onClick={createQr}>
            Create QR code
          </button>
        </div>
      </div>

      {error && <div className="result-box error" style={{ marginTop: '1rem' }}>{error}</div>}

      {qrDataUrl && (
        <div className="qr-result card-panel">
          <h3>Scan to pay</h3>
          <p className="panel-hint">Sender scans this QR on the Send page to autofill receiver, asset, and amount.</p>
          <div className="qr-code-wrap">
            <img src={qrDataUrl} alt="Payment request QR" className="qr-code-img" />
          </div>
          <div className="qr-summary">
            <strong>Pay {publicKey.trim().slice(0, 8)}…{publicKey.trim().slice(-4)}</strong>
            <span>{amount} {asset}</span>
          </div>
        </div>
      )}

      {onNavigate && (
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn-secondary" onClick={() => onNavigate('send')}>
            Go to Send / Exchange →
          </button>
        </div>
      )}
    </section>
  );
}
