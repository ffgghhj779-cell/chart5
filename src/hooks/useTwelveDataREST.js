import { useState, useCallback } from 'react';
import { LIMIT_MAP } from '../constants/assets.js';

// Convert Binance interval strings to Twelve Data format
const TD_INTERVALS = {
  '1m':  '1min',
  '5m':  '5min',
  '15m': '15min',
  '1h':  '1h',
  '4h':  '4h',
  '1d':  '1day',
  '1w':  '1week',
};

const API_KEY = '71769f932c48448aaa6d33ccc0954aec';

export function useTwelveDataREST() {
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCandles = useCallback(async (symbol, interval) => {
    setLoading(true);
    setCandles([]); // Clear while loading

    try {
      const tdInterval = TD_INTERVALS[interval] || '1day';
      // TwelveData free tier limits outputsize depending on the endpoint. We cap at 500.
      let limit = LIMIT_MAP[interval] || 500;
      
      const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${tdInterval}&outputsize=${limit}&apikey=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== 'ok' || !data.values) {
        throw new Error(data.message || 'Twelve Data API Error');
      }

      // Twelve Data returns newest first. We need oldest first (left to right)
      const reversed = data.values.reverse();

      const formatted = reversed.map(v => {
        // TwelveData datetime doesn't include timezone in the string directly, it's exchange local time or UTC.
        // Usually time_series returns string like "2024-01-01 10:00:00".
        // It's best to parse it directly. It defaults to the exchange timezone, which could cause slight shifts.
        // We'll append 'Z' for UTC if it lacks timezone info to ensure consistent parsing, or just rely on native parse.
        let dt = v.datetime;
        if (dt.length <= 19) dt = dt.replace(' ', 'T') + 'Z'; 

        return {
          t: new Date(dt).getTime(),
          o: parseFloat(v.open),
          h: parseFloat(v.high),
          l: parseFloat(v.low),
          c: parseFloat(v.close),
          v: parseFloat(v.volume || 0),
        };
      });

      setCandles(formatted);
      setLoading(false);
      return { ok: true, data: formatted };
    } catch (err) {
      console.error('REST Error (TwelveData):', err);
      setLoading(false);
      return { ok: false, data: [] };
    }
  }, []);

  return { candles, setCandles, loading, fetchCandles };
}
