import { useState } from 'react';
import CreateAccount from './components/CreateAccount';
import Dashboard from './components/Dashboard';
import SendPayment from './components/SendPayment';
import Trustline from './components/Trustline';
import Home from './components/Home';
import Login from './components/Login';
import AnchorInfo from './components/AnchorInfo';
import RequestPayment from './components/RequestPayment';
import TradeLinkLogo from './components/TradeLinkLogo';

const PAGES = [
  { id: 'home', label: 'Home' },
  { id: 'login', label: 'Login' },
  { id: 'create-account', label: 'Create Account' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'trustline', label: 'Add Trustline' },
  { id: 'request', label: 'Request payment' },
  { id: 'send', label: 'Send / Exchange' },
  { id: 'anchor', label: 'Anchor Info' },
];

function shortenKey(key) {
  if (!key || key.length < 12) return key;
  return key.slice(0, 6) + '…' + key.slice(-4);
}

export default function App() {
  const [page, setPage] = useState('home');
  const [currentAccount, setCurrentAccount] = useState({ publicKey: '', secretKey: '' });
  const [menuOpen, setMenuOpen] = useState(false);

  function handleAccountCreated(account) {
    setCurrentAccount(account);
    setPage('dashboard');
  }

  function handleLoginSuccess(account) {
    setCurrentAccount(account);
    setPage('dashboard');
  }

  function handleLogout() {
    setCurrentAccount({ publicKey: '', secretKey: '' });
    setPage('home');
  }

  function handleNavigate(id) {
    setPage(id);
    setMenuOpen(false);
  }

  const isLoggedIn = Boolean(currentAccount.publicKey && currentAccount.secretKey);

  return (
    <div className="app">
      <header className="header">
        {menuOpen && (
          <div
            className="nav-backdrop"
            onClick={() => setMenuOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && setMenuOpen(false)}
            role="button"
            tabIndex={-1}
            aria-label="Close menu"
          />
        )}
        <div className="header-inner">
          <button type="button" className="logo-wrap" onClick={() => { setPage('home'); setMenuOpen(false); }} aria-label="Home">
            <TradeLinkLogo className="logo-svg" size={36} />
            <span className="brand">TradeLink</span>
          </button>
          <button
            type="button"
            className="nav-menu-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <span className="nav-menu-icon" />
            <span className="nav-menu-icon" />
            <span className="nav-menu-icon" />
          </button>
          <nav className={`nav ${menuOpen ? 'nav-open' : ''}`}>
            {PAGES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`nav-link ${page === p.id ? 'active' : ''}`}
                onClick={() => handleNavigate(p.id)}
              >
                {p.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="main">
        {page !== 'home' && (
          <h1 className="page-title">{PAGES.find((p) => p.id === page)?.label || page}</h1>
        )}
        {page === 'home' && <Home onNavigate={handleNavigate} />}
        {page === 'login' && (
          <Login onLoginSuccess={handleLoginSuccess} onNavigate={handleNavigate} />
        )}
        {page === 'create-account' && <CreateAccount onAccountCreated={handleAccountCreated} onNavigate={handleNavigate} />}
        {page === 'dashboard' && (
          <Dashboard
            currentAccount={currentAccount}
            onNavigate={handleNavigate}
          />
        )}
        {page === 'trustline' && <Trustline onNavigate={handleNavigate} />}
        {page === 'request' && (
          <RequestPayment
            currentAccountPublicKey={currentAccount.publicKey}
            onNavigate={handleNavigate}
          />
        )}
        {page === 'send' && (
          <SendPayment
            senderKey={currentAccount.publicKey}
            senderSecret={currentAccount.secretKey}
            onNavigate={handleNavigate}
          />
        )}
        {page === 'anchor' && <AnchorInfo />}
      </main>
    </div>
  );
}
