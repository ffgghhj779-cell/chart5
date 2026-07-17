/**
 * useBinanceREST.js
 * Fetches historical OHLCV klines from the Binance REST API.
 */
import { useState, useCallback } from 'react';
import { LIMIT_MAP } from '../constants/assets.js';
import { generateFallbackCandles } from '../utils/chartMath.js';

const BINANCE_BASE = 'https://api.binance.com/api/v3/klines';

/**
 * @returns {{ candles, loading, error, fetchCandles }}
 */
export function useBinanceREST() {
  const [candles, setCandles]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState(null);

  const fetchCandles = useCallback(async (sym, interval) => {
    setLoading(true);
    setError(null);

    try {
      const limit = LIMIT_MAP[interval] ?? 400;
      const url   = `${BINANCE_BASE}?symbol=${sym}&interval=${interval}&limit=${limit}`;
      const resp  = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (!resp.ok) throw new Error(`Binance API returned HTTP ${resp.status}`);

      const raw = await resp.json();
      if (!Array.isArray(raw) || raw.length === 0) {
        throw new Error('Empty response from Binance API');
      }

      /* Binance kline format:
         [0] openTime  [1] open  [2] high  [3] low  [4] close  [5] volume … */
      const parsed = raw.map((k) => ({
        t: k[0],
        o: parseFloat(k[1]),
        h: parseFloat(k[2]),
        l: parseFloat(k[3]),
        c: parseFloat(k[4]),
        v: parseFloat(k[5]),
      }));

      setCandles(parsed);
      setLoading(false);
      return { ok: true, data: parsed };
    } catch (err) {
      console.warn(`[useBinanceREST] fetch failed (${sym}/${interval}):`, err.message);
      // Graceful fallback to synthetic data
      const fallback = generateFallbackCandles(sym, interval);
      setCandles(fallback);
      setError(err.message);
      setLoading(false);
      return { ok: false, data: fallback };
    }
  }, []);

  return { candles, setCandles, loading, error, fetchCandles };
}
