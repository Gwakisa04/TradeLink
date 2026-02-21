import { useState, useEffect } from 'react';
import { verifyLogin } from '../api';
import KeyField from './KeyField';

const SAVED_PUBLIC_KEY = 'stella_public_key';

export default function Login({ onLoginSuccess, onNavigate }) {
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [rememberPublicKey, setRememberPublicKey] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_PUBLIC_KEY);
      if (saved) setPublicKey(saved);
    } catch (_) {}
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await verifyLogin(publicKey, secretKey);
      if (rememberPublicKey && publicKey.trim()) {
        try {
          localStorage.setItem(SAVED_PUBLIC_KEY, publicKey.trim());
        } catch (_) {}
      } else {
        try {
          localStorage.removeItem(SAVED_PUBLIC_KEY);
        } catch (_) {}
      }
      if (onLoginSuccess) onLoginSuccess({ publicKey: publicKey.trim(), secretKey: secretKey.trim() });
      if (onNavigate) onNavigate('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section">
      <h2>Login (existing user)</h2>
      <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1rem' }}>
        Use your Stellar public key and secret key to access your account. Open a second browser tab and log in with different keys to act as another user.
      </p>
      <form onSubmit={handleSubmit}>
        <KeyField
          label="Account ID (public key)"
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          placeholder="G..."
          required
        />
        <KeyField
          label="Secret key (private key)"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          placeholder="S..."
          secret
          required
        />
        <div className="form-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={rememberPublicKey}
              onChange={(e) => setRememberPublicKey(e.target.checked)}
            />
            Remember public key only (secret never saved)
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Verifying…' : 'Login'}
          </button>
          {onNavigate && (
            <button type="button" className="btn-secondary" onClick={() => onNavigate('create-account')}>
              New user? Create account
            </button>
          )}
        </div>
      </form>
      {error && (
        <div className="result-box error" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}
    </section>
  );
}
