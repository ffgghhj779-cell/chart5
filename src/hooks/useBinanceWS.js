/**
 * useBinanceWS.js
 * Manages a Binance WebSocket kline stream.
 * Calls onTick(klineObj) on every incoming message.
 * Handles auto-reconnect on unexpected disconnects.
 */
import { useEffect, useRef } from 'react';

const WS_BASE = 'wss://stream.binance.com:9443/ws';
const RECONNECT_DELAY_MS = 5000;

/**
 * @param {Object}   opts
 * @param {string}   opts.symbol    – e.g. 'BTCUSDT'
 * @param {string}   opts.interval  – e.g. '1d'
 * @param {boolean}  opts.enabled   – connect only when true
 * @param {Function} opts.onTick    – called with raw kline object from Binance
 * @param {Function} opts.onStatus  – called with 'connecting' | 'live' | 'offline'
 */
export function useBinanceWS({ symbol, interval, enabled, onTick, onStatus }) {
  const wsRef            = useRef(null);
  const reconnectTimer   = useRef(null);
  const mountedRef       = useRef(true);
  const optionsRef       = useRef({ symbol, interval, enabled, onTick, onStatus });

  // Keep latest callbacks in a ref so the WS handler closure stays stable
  useEffect(() => {
    optionsRef.current = { symbol, interval, enabled, onTick, onStatus };
  });

  useEffect(() => {
    mountedRef.current = true;

    function connect() {
      if (!mountedRef.current) return;
      const { symbol: sym, interval: iv, onStatus: setStatus } = optionsRef.current;

      if (setStatus) setStatus('connecting');

      const streamName = `${sym.toLowerCase()}@kline_${iv}`;
      const url        = `${WS_BASE}/${streamName}`;

      let socket;
      try {
        socket = new WebSocket(url);
      } catch {
        if (setStatus) setStatus('offline');
        return;
      }

      wsRef.current = socket;

      socket.onopen = () => {
        if (!mountedRef.current) { socket.close(); return; }
        if (optionsRef.current.onStatus) optionsRef.current.onStatus('live');
      };

      socket.onmessage = (ev) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.k && optionsRef.current.onTick) {
            optionsRef.current.onTick(msg.k);
          }
        } catch {
          // ignore malformed frames
        }
      };

      socket.onerror = () => {
        if (optionsRef.current.onStatus) optionsRef.current.onStatus('offline');
      };

      socket.onclose = (ev) => {
        if (!mountedRef.current) return;
        if (optionsRef.current.onStatus) optionsRef.current.onStatus('offline');
        // Reconnect on abnormal close
        if (ev.code !== 1000 && mountedRef.current) {
          reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    }

    if (enabled) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close(1000, 'component unmounted');
        wsRef.current = null;
      }
    };
  // Re-run whenever symbol, interval, or enabled changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval, enabled]);
}
