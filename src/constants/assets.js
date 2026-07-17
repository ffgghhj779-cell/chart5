export const ASSETS = [
  // ── Crypto ──────────────────────────────────────────────────
  { sym: 'BTCUSDT',   label: 'BTC/USDT',   icon: '₿',  desc: 'Bitcoin',                cat: 'Crypto' },
  { sym: 'ETHUSDT',   label: 'ETH/USDT',   icon: 'Ξ',  desc: 'Ethereum',               cat: 'Crypto' },
  { sym: 'SOLUSDT',   label: 'SOL/USDT',   icon: '◎',  desc: 'Solana',                 cat: 'Crypto' },
  { sym: 'BNBUSDT',   label: 'BNB/USDT',   icon: '⬡',  desc: 'BNB Chain',              cat: 'Crypto' },
  { sym: 'XRPUSDT',   label: 'XRP/USDT',   icon: '✕',  desc: 'Ripple',                 cat: 'Crypto' },
  { sym: 'ADAUSDT',   label: 'ADA/USDT',   icon: '₳',  desc: 'Cardano',                cat: 'Crypto' },
  { sym: 'DOGEUSDT',  label: 'DOGE/USDT',  icon: 'Ð',  desc: 'Dogecoin',               cat: 'Crypto' },
  { sym: 'AVAXUSDT',  label: 'AVAX/USDT',  icon: '▲',  desc: 'Avalanche',              cat: 'Crypto' },
  { sym: 'LINKUSDT',  label: 'LINK/USDT',  icon: '⬡',  desc: 'Chainlink',              cat: 'Crypto' },
  { sym: 'DOTUSDT',   label: 'DOT/USDT',   icon: '●',  desc: 'Polkadot',               cat: 'Crypto' },
  { sym: 'MATICUSDT', label: 'MATIC/USDT', icon: '◈',  desc: 'Polygon',                cat: 'Crypto' },
  { sym: 'LTCUSDT',   label: 'LTC/USDT',   icon: 'Ł',  desc: 'Litecoin',               cat: 'Crypto' },
  // ── Tokenised Commodities ────────────────────────────────────
  { sym: 'PAXGUSDT',  label: 'PAXG/USDT',  icon: '🥇', desc: 'PAX Gold (Tokenised)',    cat: 'Commodities' },
  { sym: 'XAUTUSDT',  label: 'XAUT/USDT',  icon: '🏅', desc: 'Tether Gold (Tokenised)', cat: 'Commodities' },
];

export const DEFAULT_ASSET = ASSETS[0];

export const INTERVAL_OPTIONS = [
  { value: '1m',  label: '1M'  },
  { value: '5m',  label: '5M'  },
  { value: '15m', label: '15M' },
  { value: '1h',  label: '1H'  },
  { value: '4h',  label: '4H'  },
  { value: '1d',  label: '1D'  },
  { value: '1w',  label: '1W'  },
];

export const LIMIT_MAP = {
  '1m': 720, '5m': 500, '15m': 400,
  '1h': 500, '4h': 400, '1d': 500, '1w': 200,
};
