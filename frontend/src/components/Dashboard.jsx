import { useState, useEffect, useCallback } from 'react';
import { getAccount } from '../api';
import TxExplorerLink from './TxExplorerLink';
import KeyField from './KeyField';
import { KeyDisplay } from './KeyField';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch (_) {
    return iso;
  }
}

export default function Dashboard({ currentAccount = {}, onNavigate }) {
  const { publicKey: currentPublicKey, secretKey: currentSecretKey } = currentAccount;
  const isCurrentAccount = Boolean(currentPublicKey);

  const [publicKey, setPublicKey] = useState(currentPublicKey || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const loadAccount = useCallback(async (key) => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const result = await getAccount(key);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentPublicKey) setPublicKey(currentPublicKey);
  }, [currentPublicKey]);

  useEffect(() => {
    if (currentPublicKey?.trim()) {
      loadAccount(currentPublicKey.trim());
    }
  }, [currentPublicKey, loadAccount]);

  function handleLoad() {
    const key = publicKey.trim();
    if (!key) {
      setError('Enter an Account ID');
      return;
    }
    loadAccount(key);
  }

  const balances = data?.balances ?? [];
  const trustlines = balances.filter((b) => !b.isNative);
  const paymentHistory = data?.paymentHistory ?? [];

  return (
    <section className="section">
      <h2>Account Dashboard</h2>

      {isCurrentAccount ? (
        <div className="dashboard-current-account">
          <h3 className="dashboard-card-title">Current account (held for this session)</h3>
          <div className="dashboard-keys">
            <div className="dashboard-key-row">
              <label>Account ID <span className="label-hint">(Stellar account address)</span></label>
              <KeyDisplay value={currentPublicKey} />
            </div>
            {currentSecretKey && (
              <div className="dashboard-key-row">
                <label>Secret key</label>
                <KeyDisplay value={currentSecretKey} secret />
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="dashboard-no-account">
          Create an account or log in to see your keys, balances, and history here.
        </p>
      )}

      <div className="dashboard-load-row">
        <KeyField
          label={isCurrentAccount ? "Account ID to view (or change to view another)" : "Account ID"}
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          placeholder="G..."
        />
        <button type="button" className="btn-primary" onClick={handleLoad} disabled={loading}>
          {loading ? 'Loading…' : 'Load balances & history'}
        </button>
      </div>

      {error && (
        <div className="result-box error" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}

      {data && (
        <div className="dashboard-data">
          {/* Tokens held */}
          <h3 className="dashboard-card-title">Tokens held</h3>
          <div className="dashboard-balance-cards">
            {balances.map((b, i) => (
              <div key={i} className={`balance-card ${b.isNative ? 'balance-card-native' : 'balance-card-trust'}`}>
                <div className="balance-card-amount">{b.balance}</div>
                <div className="balance-card-asset">{b.assetCode || b.asset}</div>
                {!b.isNative && (b.limit != null || b.balance !== '0') && (
                  <span className="balance-card-badge">Trustline</span>
                )}
                {b.limit != null && b.limit !== '922337203685.4775807' && (
                  <div className="balance-card-limit">limit {b.limit}</div>
                )}
              </div>
            ))}
          </div>

          {/* Trustlines */}
          {trustlines.length > 0 && (
            <>
              <h3 className="dashboard-card-title">Trustlines</h3>
              <div className="dashboard-trustlines">
                <table className="trustline-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Balance</th>
                      <th>Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trustlines.map((b, i) => (
                      <tr key={i}>
                        <td><span className="trustline-asset">{b.assetCode || b.asset}</span></td>
                        <td className="trustline-amount">{b.balance}</td>
                        <td className="trustline-limit">{b.limit ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Payment history */}
          <h3 className="dashboard-card-title">Payment history (this account)</h3>
          {paymentHistory.length === 0 ? (
            <p className="dashboard-empty">No payments yet.</p>
          ) : (
            <div className="dashboard-payment-history">
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Asset</th>
                    <th>From / To</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((tx) => {
                    const isOut = tx.from === publicKey.trim();
                    return (
                      <tr key={tx.id}>
                        <td className="payment-date">{formatDate(tx.createdAt)}</td>
                        <td>
                          <span className={`payment-type payment-type-${isOut ? 'out' : 'in'}`}>
                            {isOut ? 'Sent' : 'Received'}
                          </span>
                        </td>
                        <td className="payment-amount">{tx.amount}</td>
                        <td className="payment-asset">{tx.assetCode}</td>
                        <td className="payment-counterparty">
                          {isOut ? `To ${(tx.to || '').slice(0, 8)}…` : `From ${(tx.from || '').slice(0, 8)}…`}
                        </td>
                        <td>
                          <TxExplorerLink hash={tx.transactionHash} label="Explorer" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
