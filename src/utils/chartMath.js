/**
 * chartMath.js – Pure math helpers: coordinate transforms, VRVP, Value Area
 */
import { LAYOUT } from '../constants/layout.js';

// ── Coordinate transforms ──────────────────────────────────────────

/** Screen X for candle at index i */
export function xForIndex(i, viewStart, viewEnd, leftPad, mainW) {
  const n = viewEnd - viewStart;
  return leftPad + (i - viewStart) * (mainW / n);
}

/** Screen Y for a price value */
export function yForPrice(price, mainH, lo, hi) {
  return mainH - ((price - lo) / (hi - lo)) * mainH;
}

/** Price value at a screen Y */
export function priceAtY(y, mainH, lo, hi) {
  return lo + ((mainH - y) / mainH) * (hi - lo);
}

/** Candle body width in px */
export function candleWidth(viewStart, viewEnd, mainW) {
  const n = viewEnd - viewStart;
  return Math.max(1, (mainW / n) * 0.68);
}

// ── Visible price range ────────────────────────────────────────────

/**
 * Returns { lo, hi } with 9 % padding applied.
 * Covers the full high-low range of all visible candles.
 */
export function visiblePriceRange(candles, viewStart, viewEnd) {
  let lo = Infinity, hi = -Infinity;
  const s = Math.max(0, viewStart);
  const e = Math.min(candles.length, viewEnd);
  for (let i = s; i < e; i++) {
    if (candles[i].h > hi) hi = candles[i].h;
    if (candles[i].l < lo) lo = candles[i].l;
  }
  if (!isFinite(lo) || !isFinite(hi)) return { lo: 0, hi: 1 };
  const pad = (hi - lo) * 0.09;
  return { lo: lo - pad, hi: hi + pad };
}

// ── Visible Range Volume Profile (VRVP) ───────────────────────────

/**
 * Build the volume profile from the candles in [viewStart, viewEnd).
 *
 * @param {Array}  candles
 * @param {number} viewStart
 * @param {number} viewEnd
 * @returns {Object|null} profile result or null if insufficient data
 */
export function buildVRVP(candles, viewStart, viewEnd) {
  const BINS  = LAYOUT.BINS;
  const VA_PCT = LAYOUT.VA_PCT;

  const s = Math.max(0, viewStart);
  const e = Math.min(candles.length, viewEnd);
  if (e <= s) return null;

  // Price range of visible candles (raw, no padding)
  let lo = Infinity, hi = -Infinity;
  for (let i = s; i < e; i++) {
    if (candles[i].h > hi) hi = candles[i].h;
    if (candles[i].l < lo) lo = candles[i].l;
  }
  const range = hi - lo;
  if (range <= 0 || !isFinite(range)) return null;

  const bSz  = range / BINS;
  const bins  = new Float64Array(BINS);

  // Distribute each candle's volume evenly across its price range
  for (let i = s; i < e; i++) {
    const c  = candles[i];
    const b0 = Math.max(0,        Math.floor((c.l - lo) / bSz));
    const b1 = Math.min(BINS - 1, Math.floor((c.h - lo) / bSz));
    const share = c.v / (b1 - b0 + 1);
    for (let b = b0; b <= b1; b++) bins[b] += share;
  }

  // POC = bin with maximum volume
  let pocBin = 0;
  for (let b = 1; b < BINS; b++) {
    if (bins[b] > bins[pocBin]) pocBin = b;
  }

  const totalVol = bins.reduce((a, x) => a + x, 0);
  const maxVal   = bins[pocBin];

  // Value Area: expand outward from POC until VA_PCT of totalVol is captured
  const target = totalVol * VA_PCT;
  let va   = bins[pocBin];
  let vaLo = pocBin;
  let vaHi = pocBin;

  while (va < target && (vaLo > 0 || vaHi < BINS - 1)) {
    const addLo = vaLo > 0       ? bins[vaLo - 1] : 0;
    const addHi = vaHi < BINS - 1 ? bins[vaHi + 1] : 0;
    if (addHi >= addLo) { vaHi++; va += addHi; }
    else                { vaLo--; va += addLo; }
  }

  const pocPrice = lo + (pocBin + 0.5) * bSz;
  const vahPrice = lo + (vaHi + 1)     * bSz;
  const valPrice = lo + vaLo            * bSz;

  // Cluster thresholds (price-based)
  const upperThr = lo + range * 0.60;   // bins above this → blue cluster
  const lowerThr = lo + range * 0.40;   // bins below this → green cluster

  return {
    bins, bSz, lo, hi, BINS,
    maxVal, totalVol,
    pocBin, pocPrice,
    vaHiBin: vaHi, vaLoBin: vaLo,
    vahPrice, valPrice,
    upperThr, lowerThr,
  };
}

// ── Fallback synthetic candle generator ───────────────────────────

/**
 * Deterministic synthetic OHLCV data using a seeded PRNG.
 * Used as fallback when the Binance API is unreachable.
 */
export function generateFallbackCandles(sym, interval) {
  function mulberry32(seed) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const seed = sym.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng  = mulberry32(seed);
  const n    = 400;

  const msPer = {
    '1m': 60e3, '5m': 300e3, '15m': 900e3,
    '1h': 3600e3, '4h': 14400e3, '1d': 86400e3, '1w': 604800e3,
  }[interval] ?? 86400e3;

  const basePrices = {
    BTC: 68000, ETH: 3800, SOL: 180, BNB: 600, XRP: 0.55,
    ADA: 0.48, DOGE: 0.18, LINK: 18, AVAX: 38, DOT: 8,
    MATIC: 0.85, LTC: 90, PAXG: 2650, XAUT: 2650,
  };
  const ticker   = sym.replace('USDT', '');
  let   price    = basePrices[ticker] ?? 1000;
  let   ts       = Date.now() - n * msPer;
  const candles  = [];

  for (let i = 0; i < n; i++) {
    const t2   = i / n;
    const bias = t2 < 0.28 ? 0.535 : t2 < 0.42 ? 0.50 : 0.455;
    const move = (rng() - bias) * price * 0.022;
    const o    = price;
    const c    = price + move;
    const ha   = Math.abs(move) * (0.5 + rng() * 1.2);
    const la   = Math.abs(move) * (0.5 + rng() * 1.2);
    candles.push({
      t: ts,
      o,
      h: Math.max(o, c) + ha,
      l: Math.min(o, c) - la,
      c,
      v: 200 + rng() * 3000 + Math.abs(move / price) * 25000,
    });
    price = c;
    ts   += msPer;
  }
  return candles;
}
