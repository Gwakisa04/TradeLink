import { useState } from 'react';
import { addTrustline, getTzsIssuer, issueTzs } from '../api';
import TxExplorerLink from './TxExplorerLink';
import KeyField from './KeyField';

const ASSETS = [
  { code: 'USDC', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' },
  { code: 'TZS', issuer: null },
];

export default function Trustline({ onNavigate }) {
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [assetCode, setAssetCode] = useState('USDC');
  const [loading, setLoading] = useState(false);
  const [issueLoading, setIssueLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [successTxHash, setSuccessTxHash] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    setSuccessTxHash('');
    try {
      let assetIssuer = ASSETS.find((a) => a.code === assetCode)?.issuer;
      if (assetCode === 'TZS') {
        assetIssuer = await getTzsIssuer();
      }
      const result = await addTrustline({
        publicKey: publicKey.trim(),
        secretKey: secretKey.trim(),
        assetCode,
        assetIssuer,
      });
      setSuccessMessage('Trustline added.');
      setSuccessTxHash(result.transactionHash);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section">
      <h2>Add Trustline</h2>
      <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1rem' }}>
        Add a trustline for USDC (testnet) or TZS (simulated custom asset) so you can hold and send them. Then use <strong>Issue 1000 TZS</strong> for the demo.
      </p>
      {onNavigate && (
        <div className="section-header-actions" style={{ marginBottom: '0.5rem' }}>
          <button type="button" className="btn-secondary" onClick={() => onNavigate('send')}>
            Next: Send / Exchange →
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <KeyField
          label="Account ID (public key)"
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          placeholder="G..."
          required
        />
        <KeyField
          label="Secret key"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          placeholder="S..."
          secret
          required
        />
        <div className="form-row">
          <label>Asset</label>
          <select value={assetCode} onChange={(e) => setAssetCode(e.target.value)}>
            <option value="USDC">USDC</option>
            <option value="TZS">TZS</option>
          </select>
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Adding…' : 'Add trustline'}
        </button>
      </form>
      {error && (
        <div className="result-box error" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}
      {(successMessage || successTxHash) && (
        <div className="result-box success result-with-explorer" style={{ marginTop: '1rem' }}>
          {successMessage && <p style={{ margin: '0 0 0.5rem' }}>{successMessage}</p>}
          {successTxHash && (
            <>
              <div className="key-display">{successTxHash}</div>
              <TxExplorerLink hash={successTxHash} />
            </>
          )}
        </div>
      )}
      {assetCode === 'TZS' && publicKey.trim() && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(71,85,105,0.4)' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Get test TZS</h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
            After adding the TZS trustline, request test TZS to this account.
          </p>
          <button
            type="button"
            className="btn-secondary"
            disabled={issueLoading}
            onClick={async () => {
              setIssueLoading(true);
              setError('');
              setSuccessMessage('');
              setSuccessTxHash('');
              try {
                const r = await issueTzs(publicKey.trim(), '1000');
                setSuccessMessage('Issued 1000 TZS.');
                setSuccessTxHash(r.transactionHash);
              } catch (e) {
                setError(e.message);
              } finally {
                setIssueLoading(false);
              }
            }}
          >
            {issueLoading ? 'Issuing…' : 'Issue 1000 TZS'}
          </button>
        </div>
      )}
    </section>
  );
}
