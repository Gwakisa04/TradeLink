/** TradeLink logo: interlocked links, cyan–indigo gradient */
export default function TradeLinkLogo({ className = '', size = 36 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="tradelink-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path
        d="M20 10a8 8 0 0 0-5.66 2.34l-2.83 2.83a8 8 0 1 0 11.31 11.31l2.83-2.83A8 8 0 0 0 20 10Z"
        fill="url(#tradelink-grad)"
        opacity="0.9"
      />
      <path
        d="M20 30a8 8 0 0 0 5.66-2.34l2.83-2.83a8 8 0 1 0-11.31-11.31l-2.83 2.83A8 8 0 0 0 20 30Z"
        fill="url(#tradelink-grad)"
        opacity="0.95"
      />
    </svg>
  );
}
