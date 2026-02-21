import { useState } from 'react';

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CopyDoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  }

  return (
    <button
      type="button"
      className="key-field-btn key-field-copy"
      onClick={handleCopy}
      disabled={!value}
      title="Copy to clipboard"
      aria-label="Copy to clipboard"
    >
      {copied ? <CopyDoneIcon /> : <CopyIcon />}
    </button>
  );
}

export function KeyDisplay({ value, secret, label }) {
  const [visible, setVisible] = useState(false);
  const displayValue = secret && !visible ? '•'.repeat(56) : value;

  return (
    <div className="key-field-display-wrap">
      <div
        className="key-display key-display-clickable"
        onClick={() => value && navigator.clipboard?.writeText(value)}
        title="Click to copy"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && value && navigator.clipboard?.writeText(value)}
      >
        {displayValue}
      </div>
      <div className="key-field-actions">
        {secret && (
          <button
            type="button"
            className="key-field-btn key-field-toggle"
            onClick={() => setVisible((v) => !v)}
            title={visible ? 'Hide' : 'Show'}
            aria-label={visible ? 'Hide' : 'Show'}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
        <CopyButton value={value} />
      </div>
    </div>
  );
}

export default function KeyField({
  label,
  value,
  onChange,
  secret = false,
  placeholder = 'G...',
  required = false,
  autoComplete = 'off',
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="form-row">
      <label>{label}</label>
      <div className="key-field-input-wrap">
        <input
          type={secret && !visible ? 'password' : 'text'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          className="key-field-input"
        />
        <div className="key-field-input-actions">
          {secret && (
            <button
              type="button"
              className="key-field-btn key-field-toggle"
              onClick={() => setVisible((v) => !v)}
              title={visible ? 'Hide' : 'Show'}
              aria-label={visible ? 'Hide' : 'Show'}
            >
              {visible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          )}
          <CopyButton value={value} />
        </div>
      </div>
    </div>
  );
}
