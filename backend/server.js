require('dotenv').config();
const express = require('express');
const cors = require('cors');
const StellarSdk = require('stellar-sdk');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to Stellar Testnet
const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
const networkPassphrase = StellarSdk.Networks.TESTNET;

// Fixed TZS issuer: create one at server start (keypair stored in memory only)
const TZS_ISSUER_KEYPAIR = StellarSdk.Keypair.random();
const TZS_ISSUER_PUBLIC = TZS_ISSUER_KEYPAIR.publicKey();

// Known testnet assets
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';
// Demo rate when orderbook has no liquidity: 1 XLM = TZS_PER_XLM TZS
const TZS_PER_XLM = 1000;

// --- Helpers ---
function assetFromCode(code) {
  if (code === 'XLM') return StellarSdk.Asset.native();
  if (code === 'USDC') return new StellarSdk.Asset('USDC', USDC_ISSUER);
  if (code === 'TZS') return new StellarSdk.Asset('TZS', TZS_ISSUER_PUBLIC);
  throw new Error(`Unknown asset: ${code}`);
}

async function getBaseFeeStroops() {
  try {
    const fee = await server.fetchBaseFee();
    return String(fee);
  } catch (_) {
    return '100';
  }
}

// --- Routes ---
app.get('/', (req, res) => {
  res.send('Stellar Backend Running 🚀');
});

// POST /create-account
app.post('/create-account', async (req, res) => {
  try {
    const keypair = StellarSdk.Keypair.random();
    const publicKey = keypair.publicKey();
    const secretKey = keypair.secret();

    const friendbotRes = await fetch(`${FRIENDBOT_URL}/?addr=${encodeURIComponent(publicKey)}`);
    if (!friendbotRes.ok) {
      const text = await friendbotRes.text();
      return res.status(400).json({ error: 'Friendbot funding failed', detail: text });
    }

    const account = await server.loadAccount(publicKey);
    const balances = account.balances.map((b) => ({
      asset: b.asset_type === 'native' ? 'XLM' : (b.asset_code || b.asset_code) + (b.asset_issuer ? `:${b.asset_issuer}` : ''),
      balance: b.balance,
      limit: b.limit,
    }));

    res.json({
      publicKey,
      secretKey,
      initialBalances: balances,
    });
  } catch (err) {
    console.error('create-account error', err);
    res.status(500).json({ error: err.message || 'Failed to create account' });
  }
});

// POST /verify-login — validate publicKey + secretKey (keypair match) and that account exists on network
app.post('/verify-login', async (req, res) => {
  try {
    const { publicKey, secretKey } = req.body;
    if (!publicKey || !secretKey) {
      return res.status(400).json({ error: 'Missing publicKey or secretKey' });
    }
    let keypair;
    try {
      keypair = StellarSdk.Keypair.fromSecret(secretKey);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid secret key' });
    }
    if (keypair.publicKey() !== publicKey.trim()) {
      return res.status(400).json({ error: 'Secret key does not match public key' });
    }
    await server.loadAccount(publicKey.trim());
    res.json({ ok: true, publicKey: keypair.publicKey() });
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ error: 'Account not found on network' });
    }
    res.status(400).json({ error: err.message || 'Login verification failed' });
  }
});

// GET /account/:publicKey
app.get('/account/:publicKey', async (req, res) => {
  try {
    const { publicKey } = req.params;
    const account = await server.loadAccount(publicKey);

    const balances = account.balances.map((b) => {
      const isNative = b.asset_type === 'native';
      return {
        asset: isNative ? 'XLM' : (b.asset_code || '') + (b.asset_issuer ? ` (${b.asset_issuer.slice(0, 8)}…)` : ''),
        assetCode: isNative ? 'XLM' : (b.asset_code || ''),
        assetIssuer: b.asset_issuer || null,
        balance: b.balance,
        limit: b.limit,
        isNative,
      };
    });

    const payments = await server.payments().forAccount(publicKey).limit(10).order('desc').call();
    const paymentHistory = payments.records.map((r) => {
      const from = r.from ?? '';
      const to = r.to ?? '';
      return {
        id: r.id,
        type: r.type,
        from,
        to,
        isIncoming: to === publicKey,
        amount: r.amount ?? '0',
        assetCode: r.asset_type === 'native' ? 'XLM' : (r.asset_code || ''),
        assetIssuer: r.asset_issuer,
        transactionHash: r.transaction_hash,
        createdAt: r.created_at,
      };
    });

    res.json({ balances, paymentHistory });
  } catch (err) {
    console.error('account error', err);
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.status(500).json({ error: err.message || 'Failed to load account' });
  }
});

// POST /add-trustline
app.post('/add-trustline', async (req, res) => {
  try {
    const { publicKey, secretKey, assetCode, assetIssuer } = req.body;
    if (!publicKey || !secretKey || !assetCode) {
      return res.status(400).json({ error: 'Missing publicKey, secretKey, or assetCode' });
    }

    let issuer = assetIssuer;
    if (assetCode === 'USDC') issuer = USDC_ISSUER;
    if (assetCode === 'TZS') issuer = TZS_ISSUER_PUBLIC;
    if (!issuer) return res.status(400).json({ error: 'assetIssuer required for non-XLM asset' });

    const keypair = StellarSdk.Keypair.fromSecret(secretKey);
    if (keypair.publicKey() !== publicKey) {
      return res.status(400).json({ error: 'Secret key does not match public key' });
    }

    const account = await server.loadAccount(publicKey);
    const asset = new StellarSdk.Asset(assetCode, issuer);
    const fee = await getBaseFeeStroops();

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee,
      networkPassphrase,
    })
      .addOperation(StellarSdk.Operation.changeTrust({ asset }))
      .setTimeout(30)
      .build();

    tx.sign(keypair);
    const result = await server.submitTransaction(tx);

    res.json({
      success: true,
      transactionHash: result.hash,
      result: result.successful ? 'success' : 'failed',
    });
  } catch (err) {
    console.error('add-trustline error', err);
    const msg = err.response?.data?.extras?.result_codes?.operations?.[0] || err.message;
    res.status(500).json({ error: msg || 'Failed to add trustline' });
  }
});

// POST /send-payment
app.post('/send-payment', async (req, res) => {
  try {
    const {
      senderPublicKey,
      senderSecretKey,
      receiverPublicKey,
      sendAsset,
      destinationAsset,
      amount,
    } = req.body;

    if (!senderPublicKey || !senderSecretKey || !receiverPublicKey || !sendAsset || !destinationAsset || amount == null) {
      return res.status(400).json({
        error: 'Missing required fields: senderPublicKey, senderSecretKey, receiverPublicKey, sendAsset, destinationAsset, amount',
      });
    }

    const keypair = StellarSdk.Keypair.fromSecret(senderSecretKey);
    if (keypair.publicKey() !== senderPublicKey) {
      return res.status(400).json({ error: 'Secret key does not match sender public key' });
    }

    const senderAccount = await server.loadAccount(senderPublicKey);
    const fee = await getBaseFeeStroops();
    const sendAssetObj = assetFromCode(sendAsset);
    const destAssetObj = assetFromCode(destinationAsset);

    let tx;

    if (sendAsset === destinationAsset) {
      // Same asset: normal payment
      tx = new StellarSdk.TransactionBuilder(senderAccount, { fee, networkPassphrase })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: receiverPublicKey,
            asset: sendAssetObj,
            amount: String(amount),
          })
        )
        .setTimeout(30)
        .build();
    } else {
      // Different assets: pathPaymentStrictReceive (cross-border conversion)
      const destAmount = String(amount);
      const sourceAssets = [sendAssetObj];
      let paths;
      try {
        paths = await server.strictReceivePaths(sourceAssets, destAssetObj, destAmount).call();
      } catch (pathErr) {
        return res.status(400).json({
          error: 'No path found for conversion. Ensure trustlines and liquidity exist.',
          detail: pathErr.message,
        });
      }
      const pathRecords = paths.records;
      if (pathRecords.length === 0) {
        const pair = `${sendAsset}→${destinationAsset}`;
        const hint = pair.includes('TZS') || pair.includes('USDC')
          ? ' TZS↔XLM liquidity is created at server start; restart the server if you just started it. For USDC↔TZS, only TZS↔XLM is supported.'
          : ' Same-asset payment always works.';
        return res.status(400).json({
          error: `No path found for ${pair}. Try same-asset payment, or ensure both accounts have the right trustlines.${hint}`,
        });
      }
      const bestPath = pathRecords[0];
      const pathAssets = (bestPath.path || []).map((p) => {
        if (p.asset_type === 'native') return StellarSdk.Asset.native();
        return new StellarSdk.Asset(p.asset_code, p.asset_issuer);
      });
      const sendMax = bestPath.source_amount || String(Number(amount) * 2);

      tx = new StellarSdk.TransactionBuilder(senderAccount, { fee, networkPassphrase })
        .addOperation(
          StellarSdk.Operation.pathPaymentStrictReceive({
            sendAsset: sendAssetObj,
            sendMax,
            destination: receiverPublicKey,
            destAsset: destAssetObj,
            destAmount,
            path: pathAssets,
          })
        )
        .setTimeout(30)
        .build();
    }

    tx.sign(keypair);
    const result = await server.submitTransaction(tx);

    res.json({
      success: true,
      transactionHash: result.hash,
      result: result.successful ? 'success' : 'failed',
    });
  } catch (err) {
    console.error('send-payment error', err);
    const extras = err.response?.data?.extras;
    const opCodes = extras?.result_codes?.operations;
    const txCode = extras?.result_codes?.transaction;
    const msg = (opCodes && opCodes[0]) || txCode || err.message;
    res.status(500).json({ error: msg || 'Payment failed' });
  }
});

// GET /market-rates — exchange rates from Stellar orderbook (server.orderbook(baseAsset, counterAsset).call())
async function fetchOrderbookRates(baseCode, counterCode) {
  const baseAsset = assetFromCode(baseCode);
  const counterAsset = assetFromCode(counterCode);
  try {
    const orderbook = await server.orderbook(baseAsset, counterAsset).call();
    const bestBid = orderbook.bids?.length ? orderbook.bids[0].price : null;
    const bestAsk = orderbook.asks?.length ? orderbook.asks[0].price : null;
    const mid = (bestBid && bestAsk)
      ? ((parseFloat(bestBid) + parseFloat(bestAsk)) / 2).toFixed(6)
      : (bestBid || bestAsk || null);
    const exchangeRate = mid ? `1 ${baseCode} = ${mid} ${counterCode}` : null;
    return {
      pair: `${baseCode}/${counterCode}`,
      base: baseCode,
      counter: counterCode,
      bestBid,
      bestAsk,
      mid,
      exchangeRate,
    };
  } catch (e) {
    return {
      pair: `${baseCode}/${counterCode}`,
      base: baseCode,
      counter: counterCode,
      bestBid: null,
      bestAsk: null,
      mid: null,
      exchangeRate: null,
      error: e.message,
    };
  }
}

app.get('/market-rates', async (req, res) => {
  try {
    const pairs = [
      ['XLM', 'USDC'],
      ['XLM', 'TZS'],
      ['USDC', 'TZS'],
    ];
    const results = await Promise.all(pairs.map(([base, counter]) => fetchOrderbookRates(base, counter)));
    const withInverse = [];
    results.forEach((r) => {
      // If XLM/TZS or TZS/XLM has no orderbook, use fallback demo rate (1 XLM = TZS_PER_XLM TZS)
      if ((r.base === 'XLM' && r.counter === 'TZS') || (r.base === 'TZS' && r.counter === 'XLM')) {
        if (!r.mid && r.base === 'XLM' && r.counter === 'TZS') {
          r.mid = String(TZS_PER_XLM);
          r.exchangeRate = `1 XLM = ${TZS_PER_XLM} TZS`;
        } else if (!r.mid && r.base === 'TZS' && r.counter === 'XLM') {
          r.mid = (1 / TZS_PER_XLM).toFixed(6);
          r.exchangeRate = `1 TZS = ${(1 / TZS_PER_XLM).toFixed(6)} XLM`;
        }
      }
      withInverse.push(r);
      if (r.mid && parseFloat(r.mid) > 0) {
        const inv = 1 / parseFloat(r.mid);
        withInverse.push({
          pair: `${r.counter}/${r.base}`,
          base: r.counter,
          counter: r.base,
          bestBid: r.bestAsk ? (1 / parseFloat(r.bestAsk)).toFixed(6) : null,
          bestAsk: r.bestBid ? (1 / parseFloat(r.bestBid)).toFixed(6) : null,
          mid: inv.toFixed(6),
          exchangeRate: `1 ${r.counter} = ${inv.toFixed(6)} ${r.base}`,
        });
      }
    });
    res.json({ rates: withInverse });
  } catch (err) {
    console.error('market-rates error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch market rates' });
  }
});

// Expose TZS issuer for frontend (e.g. for display or trustline)
app.get('/tzs-issuer', (req, res) => {
  res.json({ tzsIssuer: TZS_ISSUER_PUBLIC });
});

// POST /issue-tzs — send TZS from fixed issuer to destination (for demo only)
app.post('/issue-tzs', async (req, res) => {
  try {
    const { destination, amount } = req.body;
    if (!destination || amount == null) {
      return res.status(400).json({ error: 'Missing destination or amount' });
    }
    const issuerAccount = await server.loadAccount(TZS_ISSUER_PUBLIC).catch(() => null);
    if (!issuerAccount) {
      return res.status(400).json({
        error: 'TZS issuer not funded. Fund it once with Friendbot: ' + TZS_ISSUER_PUBLIC,
      });
    }
    const tzsAsset = new StellarSdk.Asset('TZS', TZS_ISSUER_PUBLIC);
    const fee = await getBaseFeeStroops();
    const tx = new StellarSdk.TransactionBuilder(issuerAccount, { fee, networkPassphrase })
      .addOperation(StellarSdk.Operation.allowTrust({
        trustor: destination,
        assetCode: 'TZS',
        authorize: 1,
      }))
      .addOperation(
        StellarSdk.Operation.payment({
          destination,
          asset: tzsAsset,
          amount: String(amount),
        })
      )
      .setTimeout(30)
      .build();
    tx.sign(TZS_ISSUER_KEYPAIR);
    const result = await server.submitTransaction(tx);
    res.json({ success: true, transactionHash: result.hash });
  } catch (err) {
    console.error('issue-tzs error', err);
    res.status(500).json({ error: err.message || 'Issue failed' });
  }
});

const PORT = process.env.PORT || 3000;
const TZS_ASSET = new StellarSdk.Asset('TZS', TZS_ISSUER_PUBLIC);
const XLM_NATIVE = StellarSdk.Asset.native();

async function ensureTzsIssuerFunded() {
  try {
    await server.loadAccount(TZS_ISSUER_PUBLIC);
    console.log('TZS issuer already funded');
  } catch (_) {
    const res = await fetch(`${FRIENDBOT_URL}/?addr=${encodeURIComponent(TZS_ISSUER_PUBLIC)}`);
    if (res.ok) {
      console.log('TZS issuer funded via Friendbot');
      await new Promise((r) => setTimeout(r, 2500));
    } else {
      console.warn('TZS issuer not funded; fund manually with Friendbot for issue-tzs:', TZS_ISSUER_PUBLIC);
      return;
    }
  }
}

/** Step 1: Issuer adds trustline for TZS, then issues TZS to self (no allowTrust for self). */
async function issueTzsToIssuer() {
  const account = await server.loadAccount(TZS_ISSUER_PUBLIC);
  const fee = await getBaseFeeStroops();
  const hasTzsTrust = account.balances.some(
    (b) => b.asset_type !== 'native' && b.asset_code === 'TZS' && b.asset_issuer === TZS_ISSUER_PUBLIC
  );
  const tzsBalance = account.balances.find(
    (b) => b.asset_type !== 'native' && b.asset_code === 'TZS' && b.asset_issuer === TZS_ISSUER_PUBLIC
  );
  if (tzsBalance && parseFloat(tzsBalance.balance) >= 500000) return true;

  const ops = [];
  if (!hasTzsTrust) {
    ops.push(StellarSdk.Operation.changeTrust({ asset: TZS_ASSET, limit: '1000000000' }));
  }
  ops.push(
    StellarSdk.Operation.payment({
      destination: TZS_ISSUER_PUBLIC,
      asset: TZS_ASSET,
      amount: '1000000',
    })
  );

  let tx = new StellarSdk.TransactionBuilder(account, { fee, networkPassphrase });
  ops.forEach((op) => { tx = tx.addOperation(op); });
  tx = tx.setTimeout(30).build();
  tx.sign(TZS_ISSUER_KEYPAIR);
  await server.submitTransaction(tx);
  return true;
}

/** Step 2: Create orderbook offers so path TZS ↔ XLM exists. Two separate txs for clearer errors. */
async function createTzsXlmLiquidity() {
  try {
    await issueTzsToIssuer();
    await new Promise((r) => setTimeout(r, 2000));
    const account = await server.loadAccount(TZS_ISSUER_PUBLIC);
    const fee = await getBaseFeeStroops();

    // Tx 1: Sell TZS for XLM (1 TZS = 1/1000 XLM)
    try {
      const tx1 = new StellarSdk.TransactionBuilder(account, { fee, networkPassphrase })
        .addOperation(StellarSdk.Operation.manageSellOffer({
          selling: TZS_ASSET,
          buying: XLM_NATIVE,
          amount: '500000',
          price: { n: 1, d: TZS_PER_XLM },
        }))
        .setTimeout(30)
        .build();
      tx1.sign(TZS_ISSUER_KEYPAIR);
      await server.submitTransaction(tx1);
      console.log('TZS/XLM liquidity: sell TZS for XLM offer created');
    } catch (e1) {
      const data = e1.response?.data;
      console.warn('TZS/XLM offer (sell TZS):', data?.extras?.result_codes || e1.message);
    }

    await new Promise((r) => setTimeout(r, 1500));
    const account2 = await server.loadAccount(TZS_ISSUER_PUBLIC);

    // Tx 2: Sell XLM for TZS (1 XLM = 1000 TZS). Use 1000 XLM max so we only need 1M TZS to fill.
    try {
      const tx2 = new StellarSdk.TransactionBuilder(account2, { fee, networkPassphrase })
        .addOperation(StellarSdk.Operation.manageSellOffer({
          selling: XLM_NATIVE,
          buying: TZS_ASSET,
          amount: '1000',
          price: { n: TZS_PER_XLM, d: 1 },
        }))
        .setTimeout(30)
        .build();
      tx2.sign(TZS_ISSUER_KEYPAIR);
      await server.submitTransaction(tx2);
      console.log('TZS/XLM liquidity: sell XLM for TZS offer created');
    } catch (e2) {
      const data = e2.response?.data;
      console.warn('TZS/XLM offer (sell XLM):', data?.extras?.result_codes || e2.message);
    }
  } catch (err) {
    const data = err.response?.data;
    console.warn('TZS/XLM liquidity setup:', data?.extras?.result_codes || err.message);
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on http://0.0.0.0:${PORT} (reachable from network)`);
  console.log('TZS issuer (testnet):', TZS_ISSUER_PUBLIC);
  await ensureTzsIssuerFunded();
  createTzsXlmLiquidity().catch(() => {});
});
