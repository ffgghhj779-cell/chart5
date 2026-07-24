import { useEffect, useRef } from 'react';

const API_KEY = '71769f932c48448aaa6d33ccc0954aec';

export function useTwelveDataWS({ symbol, enabled, onTick, onStatus }) {
  const ws = useRef(null);

  useEffect(() => {
    if (!enabled || !symbol) return;

    onStatus('connecting');

    const connect = () => {
      ws.current = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${API_KEY}`);

      ws.current.onopen = () => {
        onStatus('connected');
        ws.current.send(JSON.stringify({
          action: 'subscribe',
          params: { symbols: symbol }
        }));
      };

      ws.current.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'price') {
            onTick({
              isTwelveData: true,
              price: msg.price,
              timestamp: msg.timestamp * 1000 // Convert unix seconds to ms
            });
          }
        } catch (err) {
          console.error('WS Parse error', err);
        }
      };

      ws.current.onclose = () => {
        onStatus('disconnected');
        // Reconnect after 3s
        setTimeout(() => {
          if (ws.current) connect();
        }, 3000);
      };

      ws.current.onerror = () => {
        onStatus('error');
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
        ws.current = null;
      }
    };
  }, [symbol, enabled, onStatus, onTick]);
}
