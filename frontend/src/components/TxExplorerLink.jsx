import { TESTNET_EXPLORER_TX } from '../api';

export default function TxExplorerLink({ hash, label = 'View on Testnet Explorer' }) {
  if (!hash) return null;
  const url = `${TESTNET_EXPLORER_TX}/${hash}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="explorer-link">
      {label} →
    </a>
  );
}
