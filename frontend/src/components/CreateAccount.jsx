import { useState } from 'react';
import { createAccount } from '../api';
import { KeyDisplay } from './KeyField';

export default function CreateAccount({ onAccountCreated, onNavigate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function handleCreate() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await createAccount();
      setResult(data);
      if (onAccountCreated) onAccountCreated({ publicKey: data.publicKey, secretKey: data.secretKey });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section">
      <h2>Create Account</h2>
      <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1rem' }}>
        Generate a new Stellar Testnet account and fund it with Friendbot (10,000 XLM).
      </p>
      <div className="section-header-actions">
        <button type="button" className="btn-primary" onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating…' : 'Create & fund account'}
        </button>
        {onNavigate && (
          <button type="button" className="btn-secondary" onClick={() => onNavigate('trustline')}>
            Next: Add Trustline
          </button>
        )}
      </div>
      {error && (
        <div className="result-box error" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}
      {result && (
        <div className="result-box success" style={{ marginTop: '1rem' }}>
          <div><strong>Account ID</strong> <span className="label-hint">(Stellar account address / public key)</span></div>
          <KeyDisplay value={result.publicKey} />
          <div style={{ marginTop: '0.75rem' }}><strong>Secret key</strong> (keep private)</div>
          <KeyDisplay value={result.secretKey} secret />
          {result.initialBalances?.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <strong>Balances:</strong>{' '}
              {result.initialBalances.map((b) => `${b.asset}: ${b.balance}`).join(', ')}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
