export default function AnchorInfo() {
  return (
    <div className="page anchor-page">
      <div className="section">
        <h2>What is an Anchor?</h2>
        <p>
          On Stellar, an <strong>Anchor</strong> is a regulated entity (e.g. bank, fintech, or licensed provider) that issues and redeems assets. Anchors hold off-chain reserves and credit/debit Stellar accounts so users can deposit and withdraw fiat or other assets.
        </p>
      </div>

      <div className="section">
        <h2>How this would connect to Yellow Card</h2>
        <p>
          <strong>Yellow Card</strong> could act as an Anchor for African markets: users deposit local currency (e.g. NGN, TZS) and receive a Stellar token (e.g. naira or TZS stablecoin). This demo’s TZS token simulates that: an issuer creates and sends TZS on Stellar. In production, Yellow Card would be the issuer and custody reserves; users would onboard via their app and get Stellar-based balances for cross-border sends and conversions.
        </p>
      </div>

      <div className="section">
        <h2>How this would connect to MoneyGram</h2>
        <p>
          <strong>MoneyGram</strong> integrates with Stellar for settlement and potentially for consumer payouts. As an Anchor or partner, MoneyGram could accept Stellar-based USDC or other assets from this flow and pay out in local cash. The path payment (e.g. TZS → USDC) in this app demonstrates the kind of conversion that could feed into MoneyGram’s rails: send asset on Stellar, partner converts and delivers fiat on the ground.
        </p>
      </div>

      <div className="section">
        <h2>SEP-24 & SEP-31</h2>
        <p>
          <strong>SEP-24 (Hosted Deposit/Withdrawal)</strong> defines a standard flow for Anchors to host deposit/withdrawal UIs. A user clicks “deposit” in a wallet; the wallet opens the Anchor’s hosted page (or popup) to complete KYC and deposit. This app doesn’t implement SEP-24 but the same concept (user gets an on-chain balance after off-chain steps) is what Anchors like Yellow Card would use.
        </p>
        <p style={{ marginTop: '0.75rem' }}>
          <strong>SEP-31 (Cross-Border Payments)</strong> defines a protocol for sending cross-border payments through a regulated Anchor. One party sends funds to the Anchor’s Stellar address; the Anchor credits the recipient in their local currency. Our path payment (TZS → USDC) is a simplified on-chain analogue: one asset is converted to another across the network; in a full SEP-31 flow, the Anchor would handle compliance and payout.
        </p>
      </div>
    </div>
  );
}
