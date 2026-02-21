import { useState, useEffect, useCallback } from 'react';
import { sendPayment, getMarketRates } from '../api';
import TxExplorerLink from './TxExplorerLink';
import KeyField from './KeyField';
import ScanQRModal from './ScanQRModal';
import { decodeRequestPayload } from './RequestPayment';

const ASSET_OPTIONS = ['XLM', 'USDC', 'TZS'];

export default function SendPayment({ senderKey, senderSecret, onNavigate }) {
  const [senderPublicKey, setSenderPublicKey] = useState(senderKey || '');
  const [senderSecretKey, setSenderSecretKey] = useState(senderSecret || '');
  const [receiverPublicKey, setReceiverPublicKey] = useState('');
  const [sendAsset, setSendAsset] = useState('XLM');
  const [destinationAsset, setDestinationAsset] = useState('XLM');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [successDetails, setSuccessDetails] = useState(null);

  const [marketRates, setMarketRates] = useState([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState('');
  const [page, setPage] = useState('send');
  const [showScanModal, setShowScanModal] = useState(false);

  useEffect(() => {
    if (senderKey) setSenderPublicKey(senderKey);
    if (senderSecret) setSenderSecretKey(senderSecret);
  }, [senderKey, senderSecret]);

  useEffect(() => {
    let cancelled = false;
    setRatesLoading(true);
    setRatesError('');
    getMarketRates()
      .then((rates) => { if (!cancelled) setMarketRates(rates || []); })
      .catch((e) => { if (!cancelled) setRatesError(e.message); })
      .finally(() => { if (!cancelled) setRatesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleSendSubmit(e, opts = {}) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    setSuccessDetails(null);
    const destAsset = opts.sameAsset ? sendAsset : destinationAsset;
    const receiver = opts.useSenderAsReceiver ? senderPublicKey.trim() : receiverPublicKey.trim();
    // For exchange (path payment): backend expects destAmount (amount of destination asset to receive).
    const isExchange = opts.useSenderAsReceiver && sendAsset !== destinationAsset;
    if (isExchange && !estimated) {
      setLoading(false);
      setError(`No rate for ${sendAsset}→${destinationAsset}. Add trustlines and ensure liquidity exists.`);
      return;
    }
    const amountToSend = isExchange && estimated
      ? String(estimated.amount)
      : amount.trim();
    try {
      const data = await sendPayment({
        senderPublicKey: senderPublicKey.trim(),
        senderSecretKey: senderSecretKey.trim(),
        receiverPublicKey: receiver,
        sendAsset,
        destinationAsset: destAsset,
        amount: amountToSend,
      });
      setResult(data);
      setSuccessDetails({
        amountSent: amountToSend,
        sendAsset,
        destinationAsset: destAsset,
        receiverPublicKey: receiver,
        isExchange: !!opts.useSenderAsReceiver && sendAsset !== destAsset,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const sameAsset = sendAsset === destinationAsset;

  // Estimated amount to receive on exchange, using Stellar orderbook rate
  function getEstimatedReceive(fromAsset, toAsset, fromAmountStr) {
    if (fromAsset === toAsset || !fromAmountStr || !marketRates.length) return null;
    const num = parseFloat(fromAmountStr);
    if (Number.isNaN(num) || num <= 0) return null;
    const direct = marketRates.find((r) => r.base === fromAsset && r.counter === toAsset && r.mid);
    if (direct) return { amount: num * parseFloat(direct.mid), rate: direct.mid, pair: direct.pair };
    const inverse = marketRates.find((r) => r.base === toAsset && r.counter === fromAsset && r.mid);
    if (inverse) return { amount: num / parseFloat(inverse.mid), rate: (1 / parseFloat(inverse.mid)).toFixed(6), pair: `${fromAsset}/${toAsset}` };
    return null;
  }
  const estimated = page === 'exchange' ? getEstimatedReceive(sendAsset, destinationAsset, amount) : null;

  const handleQRScan = useCallback((decodedText) => {
    const data = decodeRequestPayload(decodedText);
    if (data?.publicKey) {
      setReceiverPublicKey(data.publicKey);
      if (data.asset) {
        setDestinationAsset(data.asset);
        setSendAsset(data.asset);
      }
      if (data.amount !== undefined && data.amount !== '') setAmount(data.amount);
      setPage('send');
    }
  }, []);

  return (
    <section className="section send-exchange-page">
      <div className="send-exchange-header">
        <h2>Send &amp; Exchange</h2>
        <div className="page-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={page === 'send'}
            className={`page-tab ${page === 'send' ? 'active' : ''}`}
            onClick={() => setPage('send')}
          >
            Send
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={page === 'exchange'}
            className={`page-tab ${page === 'exchange' ? 'active' : ''}`}
            onClick={() => setPage('exchange')}
          >
            Exchange
          </button>
        </div>
      </div>

      {page === 'send' && (
        <div className="send-exchange-view send-view">
          <h3>Send token</h3>
          <p className="panel-hint">Send the same asset to a receiver. Or scan a payment request QR to autofill.</p>
          <div className="form-actions" style={{ marginBottom: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={() => setShowScanModal(true)}>
              📷 Scan QR to fill
            </button>
          </div>
          <form onSubmit={(e) => handleSendSubmit(e, { sameAsset: true })}>
            <KeyField
              label="Sender Account ID (public key)"
              value={senderPublicKey}
              onChange={(e) => setSenderPublicKey(e.target.value)}
              placeholder="G..."
              required
            />
            <KeyField
              label="Sender secret key"
              value={senderSecretKey}
              onChange={(e) => setSenderSecretKey(e.target.value)}
              placeholder="S..."
              secret
              required
            />
            <KeyField
              label="Receiver Account ID (public key)"
              value={receiverPublicKey}
              onChange={(e) => setReceiverPublicKey(e.target.value)}
              placeholder="G..."
              required
            />
            <div className="form-row">
              <label>Asset to send</label>
              <select value={sendAsset} onChange={(e) => setSendAsset(e.target.value)}>
                {ASSET_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Amount</label>
              <input
                type="text"
                placeholder="e.g. 10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Sending…' : 'Send payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {page === 'exchange' && (
        <div className="send-exchange-view exchange-view">
          <h3>Exchange token</h3>
          <p className="panel-hint">Convert from one asset to another in your own account. You only need your keys and the From/To assets.</p>
          <form onSubmit={(e) => handleSendSubmit(e, { useSenderAsReceiver: true })}>
            <KeyField
              label="Your Account ID (public key)"
              value={senderPublicKey}
              onChange={(e) => setSenderPublicKey(e.target.value)}
              placeholder="G..."
              required
            />
            <KeyField
              label="Your secret key"
              value={senderSecretKey}
              onChange={(e) => setSenderSecretKey(e.target.value)}
              placeholder="S..."
              secret
              required
            />
            <div className="form-row">
              <label>From (asset you hold)</label>
              <select value={sendAsset} onChange={(e) => setSendAsset(e.target.value)}>
                {ASSET_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>To (asset you receive)</label>
              <select value={destinationAsset} onChange={(e) => setDestinationAsset(e.target.value)}>
                {ASSET_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Amount (in &quot;From&quot; asset)</label>
              <input
                type="text"
                placeholder="e.g. 10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            {!sameAsset && (
              <div className="form-row estimated-receive">
                <label>Estimated you receive (Stellar rate)</label>
                <div className="estimated-receive-value">
                  {estimated ? (
                    <>
                      <strong>{estimated.amount.toFixed(6)} {destinationAsset}</strong>
                      <span className="estimated-receive-hint">1 {sendAsset} = {estimated.rate} {destinationAsset}</span>
                    </>
                  ) : amount.trim() && sendAsset !== destinationAsset ? (
                    <span className="estimated-receive-none">Rate not available for {sendAsset}/{destinationAsset}</span>
                  ) : null}
                </div>
              </div>
            )}
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading || sameAsset}>
                {loading ? 'Exchanging…' : sameAsset ? 'Choose different From/To to exchange' : 'Exchange (path payment)'}
              </button>
            </div>
          </form>

          <div className="market-rates-block">
            <h4>Exchange rates (Stellar orderbook)</h4>
            <p className="panel-hint">From <code>server.orderbook(baseAsset, counterAsset).call()</code> on Horizon testnet.</p>
            {ratesLoading && <p className="loading">Loading exchange rates…</p>}
            {ratesError && <p className="result-box error">{ratesError}</p>}
            {!ratesLoading && !ratesError && marketRates.length > 0 && (
              <ul className="market-rates-list">
                {marketRates.map((r) => (
                  <li key={r.pair} className="market-rate-item">
                    <span className="market-rate-pair">{r.pair}</span>
                    {r.exchangeRate ? (
                      <span className="market-rate-mid">{r.exchangeRate}</span>
                    ) : r.mid ? (
                      <span className="market-rate-mid">1 {r.base} = {r.mid} {r.counter}</span>
                    ) : (
                      <span className="market-rate-none">{r.error ? `— ${r.error}` : '— No liquidity'}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!ratesLoading && !ratesError && marketRates.length === 0 && (
              <p className="panel-hint">No orderbook data available for these pairs.</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="result-box error" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}
      {result && result.result === 'success' && successDetails && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="success-modal-title">
          <div className="modal-content success-modal">
            <div className="success-modal-icon">✓</div>
            <h3 id="success-modal-title" className="success-modal-title">Payment sent</h3>
            <p className="success-modal-subtitle">Your transaction was successful</p>
            <div className="success-modal-details">
              <div className="success-modal-row">
                <span className="success-modal-label">Amount sent</span>
                <span className="success-modal-value">
                  {successDetails.isExchange
                    ? `${successDetails.amountSent} ${successDetails.sendAsset} → ${successDetails.destinationAsset}`
                    : `${successDetails.amountSent} ${successDetails.sendAsset}`}
                </span>
              </div>
              <div className="success-modal-row">
                <span className="success-modal-label">To wallet</span>
                <span className="success-modal-value success-modal-wallet" title={successDetails.receiverPublicKey}>
                  {successDetails.receiverPublicKey.slice(0, 8)}…{successDetails.receiverPublicKey.slice(-8)}
                </span>
              </div>
              <div className="success-modal-row">
                <span className="success-modal-label">Transaction</span>
                <span className="success-modal-value success-modal-tx">
                  {result.transactionHash.slice(0, 10)}…{result.transactionHash.slice(-8)}
                </span>
              </div>
            </div>
            <div className="success-modal-actions">
              <span className="success-modal-explorer-wrap">
                <TxExplorerLink hash={result.transactionHash} label="View on Explorer" />
              </span>
              <button
                type="button"
                className="btn-primary success-modal-close"
                onClick={() => { setResult(null); setSuccessDetails(null); }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {onNavigate && (
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn-secondary" onClick={() => onNavigate('dashboard')}>
            Dashboard →
          </button>
        </div>
      )}

      {showScanModal && (
        <ScanQRModal
          onScan={handleQRScan}
          onClose={() => setShowScanModal(false)}
        />
      )}
    </section>
  );
}
