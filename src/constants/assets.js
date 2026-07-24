export const ASSETS = [
  // ── Crypto (Binance) ────────────────────────────────────────
  { sym: 'BTCUSDT',   label: 'BTC/USDT',   icon: '₿',  desc: 'Bitcoin',      cat: 'Crypto', provider: 'binance' },
  { sym: 'ETHUSDT',   label: 'ETH/USDT',   icon: 'Ξ',  desc: 'Ethereum',     cat: 'Crypto', provider: 'binance' },
  { sym: 'SOLUSDT',   label: 'SOL/USDT',   icon: '◎',  desc: 'Solana',       cat: 'Crypto', provider: 'binance' },
  { sym: 'BNBUSDT',   label: 'BNB/USDT',   icon: '⬡',  desc: 'BNB Chain',    cat: 'Crypto', provider: 'binance' },
  { sym: 'XRPUSDT',   label: 'XRP/USDT',   icon: '✕',  desc: 'Ripple',       cat: 'Crypto', provider: 'binance' },
  { sym: 'ADAUSDT',   label: 'ADA/USDT',   icon: '₳',  desc: 'Cardano',      cat: 'Crypto', provider: 'binance' },
  { sym: 'DOGEUSDT',  label: 'DOGE/USDT',  icon: 'Ð',  desc: 'Dogecoin',     cat: 'Crypto', provider: 'binance' },
  
  // ── Commodities (Twelve Data) ───────────────────────────────
  { sym: 'XAU/USD',   label: 'XAU/USD',    icon: '🥇', desc: 'Gold Spot',    cat: 'Commodities', provider: 'twelvedata' },
  { sym: 'USO',       label: 'USO (Oil)',  icon: '🛢️', desc: 'US Oil Fund',  cat: 'Commodities', provider: 'twelvedata' },
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
