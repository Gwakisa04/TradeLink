const DEMO_STEPS = [
  { step: 1, title: 'Create Account', id: 'create-account', desc: 'Generate a Stellar keypair and fund with Friendbot (10,000 XLM).' },
  { step: 2, title: 'Add Trustline', id: 'trustline', desc: 'Add trustline for USDC or TZS so you can hold and send them.' },
  { step: 3, title: 'Issue TZS', id: 'trustline', desc: 'After TZS trustline, use "Issue 1000 TZS" to get test tokens from the issuer.' },
  { step: 4, title: 'Send TZS', id: 'send', desc: 'Send TZS (or XLM/USDC) to another account—same-asset payment.' },
  { step: 5, title: 'TZS → USDC conversion', id: 'send', desc: 'Use pathPaymentStrictReceive: select Send TZS, Destination USDC.' },
  { step: 6, title: 'Dashboard', id: 'dashboard', desc: 'View balances and recent transactions; open tx in Testnet Explorer.' },
];

export default function Home({ onNavigate }) {
  return (
    <div className="page home-page">
      <div className="hero home-hero">
        <div className="hero-badge">Stellar Testnet</div>
        <h1 className="hero-title">
          Cross-border payments, <span className="hero-title-accent">linked</span>
        </h1>
        <p className="hero-tagline">
          TradeLink lets you create accounts, add trustlines, and send or convert XLM, USDC, and TZS—all on Stellar, no database. Built for demos and hackathons.
        </p>
        <p className="hero-desc">
          Open this app in two browser tabs to act as two users: create or log in as User A in one tab and User B in the other, then send payments between them using the receiver’s public key.
        </p>
      </div>

      <div className="section demo-flow home-section home-anim" style={{ animationDelay: '0.1s' }}>
        <h3>Demo flow (what judges want to see)</h3>
        <p className="section-desc">Follow this order for a clear, professional demo.</p>
        <ol className="steps-list">
          {DEMO_STEPS.map(({ step, title, id, desc }, i) => (
            <li key={step} className="step-item home-anim" style={{ animationDelay: `${0.2 + i * 0.06}s` }}>
              <span className="step-num">{step}</span>
              <div>
                <button type="button" className="step-link" onClick={() => onNavigate(id)}>
                  {title}
                </button>
                <p className="step-desc">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="section criteria home-section home-anim" style={{ animationDelay: '0.55s' }}>
        <h3>What this demo shows</h3>
        <ul className="criteria-list">
          <li>✔️ Cross-border concept (path payments)</li>
          <li>✔️ Path payments (pathPaymentStrictReceive)</li>
          <li>✔️ Account creation & Friendbot funding</li>
          <li>✔️ Trustlines (USDC, TZS)</li>
          <li>✔️ Asset issuance (TZS custom token)</li>
          <li>✔️ Real Testnet transactions + Explorer links</li>
        </ul>
      </div>

      <div className="cta-row home-anim" style={{ animationDelay: '0.7s' }}>
        <button type="button" className="btn-primary btn-lg" onClick={() => onNavigate('create-account')}>
          New user — Create account
        </button>
        <button type="button" className="btn-secondary btn-lg" onClick={() => onNavigate('login')}>
          Existing user — Login
        </button>
        <button type="button" className="btn-secondary btn-lg" onClick={() => onNavigate('send')}>
          Send / Exchange
        </button>
      </div>
    </div>
  );
}
