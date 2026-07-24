/**
 * App.jsx – Root application component
 * Orchestrates: data fetching, WebSocket, state, and layout.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { Toolbar }       from './components/Toolbar/Toolbar.jsx';
import { StatusBar }     from './components/StatusBar.jsx';
import { LoadingOverlay } from './components/LoadingOverlay.jsx';
import { ChartCanvas }   from './components/Chart/ChartCanvas.jsx';
import { useBinanceREST } from './hooks/useBinanceREST.js';
import { useBinanceWS }   from './hooks/useBinanceWS.js';
import { useTwelveDataREST } from './hooks/useTwelveDataREST.js';
import { useTwelveDataWS }   from './hooks/useTwelveDataWS.js';
import { DEFAULT_ASSET, LIMIT_MAP }  from './constants/assets.js';

// Helper for TwelveData interval ms
const getIntervalMs = (interval) => {
  const map = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '1h': 3600000,
    '4h': 14400000,
    '1d': 86400000,
    '1w': 604800000,
  };
  return map[interval] || 86400000;
};

export default function App() {
  // ── Asset / interval state ─────────────────────────────────────
  const [currentAsset,    setCurrentAsset]    = useState(DEFAULT_ASSET);
  const [currentInterval, setCurrentInterval] = useState('1d');

  // ── Overlay toggles ────────────────────────────────────────────
  const [overlays, setOverlays] = useState({ showPOC: true, showLiq: true, showVA: true });

  // ── WebSocket status ───────────────────────────────────────────
  const [wsStatus,  setWsStatus]  = useState('connecting');
  const [wsEnabled, setWsEnabled] = useState(false);   // enable after REST load

  // ── Live price + change tracking ───────────────────────────────
  const [livePrice,    setLivePrice]    = useState(0);
  const [priceChange,  setPriceChange]  = useState(0);
  const [tickCount,    setTickCount]    = useState(0);
  const openPriceRef   = useRef(0);   // first candle close of current session
  const lastFlashTimer = useRef(null);

  // ── Fallback flag ──────────────────────────────────────────────
  const [isFallback, setIsFallback] = useState(false);

  // ── Hovered candle (for toolbar OHLCV) ────────────────────────
  const [hoveredCandle, setHoveredCandle] = useState(null);

  // ── Profile view info (for status bar) ────────────────────────
  const [viewInfo, setViewInfo] = useState({
    pocPrice:     0,
    vahPrice:     0,
    valPrice:     0,
    visibleCount: 0,
    dateFrom:     null,
    dateTo:       null,
  });

  // ── REST data hooks ────────────────────────────────────────────
  const bRest = useBinanceREST();
  const tRest = useTwelveDataREST();

  const isBinance = currentAsset.provider !== 'twelvedata';
  const activeRest = isBinance ? bRest : tRest;
  const { candles, setCandles, loading, fetchCandles } = activeRest;

  // ── Load symbol helper ─────────────────────────────────────────
  const loadSymbol = useCallback(async (asset, interval) => {
    setWsEnabled(false);
    setTickCount(0);
    setLivePrice(0);
    setPriceChange(0);
    setHoveredCandle(null);

    // Call the correct fetch method based on the asset being loaded
    const result = await (asset.provider === 'twelvedata' ? tRest.fetchCandles : bRest.fetchCandles)(asset.sym, interval);
    setIsFallback(!result.ok);

    if (result.data.length > 0) {
      const last = result.data[result.data.length - 1];
      openPriceRef.current = result.data[0].o;
      setLivePrice(last.c);
      setPriceChange(((last.c - result.data[0].o) / result.data[0].o) * 100);
    }

    // Enable WS after data is ready
    setWsEnabled(true);
  }, [bRest.fetchCandles, tRest.fetchCandles]);

  // ── Initial load ───────────────────────────────────────────────
  useEffect(() => {
    loadSymbol(DEFAULT_ASSET, '1d');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── WebSocket tick handler ─────────────────────────────────────
  const handleTick = useCallback((payload) => {
    let newPrice = 0;
    let arrow = '';

    setCandles(prev => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      let last = { ...next[next.length - 1] };

      if (payload.isTwelveData) {
        // TwelveData raw price tick logic
        const price = payload.price;
        const tickTime = payload.timestamp;
        const ivMs = getIntervalMs(currentInterval);
        const candleStart = Math.floor(tickTime / ivMs) * ivMs;

        if (candleStart === last.t) {
          last.c = price;
          last.h = Math.max(last.h, price);
          last.l = Math.min(last.l, price);
          next[next.length - 1] = last;
        } else if (candleStart > last.t) {
          last = { t: candleStart, o: price, h: price, l: price, c: price, v: 0 };
          next.push(last);
        }
        newPrice = price;
        arrow = price >= next[next.length - 1].o ? '▲' : '▼';
      } else {
        // Binance fully-formed kline logic
        const k = payload;
        const newCandle = {
          t: k.t,
          o: parseFloat(k.o),
          h: parseFloat(k.h),
          l: parseFloat(k.l),
          c: parseFloat(k.c),
          v: parseFloat(k.v),
        };

        if (last.t === newCandle.t) {
          next[next.length - 1] = newCandle;
        } else if (newCandle.t > last.t) {
          next.push(newCandle);
        }
        newPrice = newCandle.c;
        arrow = newCandle.c >= newCandle.o ? '▲' : '▼';
      }

      // Update live price state directly here using refs if needed, 
      // but standard setState works if we extract the new price out
      return next;
    });

    // Update live price and tab title out-of-band to avoid tricky stale state in useCallback
    setLivePrice(prevLive => {
      // Small trick: since we don't have newPrice natively exposed outside setCandles easily without another ref,
      // we can just rely on the latest tick we parsed.
      // Wait, we need the parsed price. We can re-parse it here.
      const p = payload.isTwelveData ? payload.price : parseFloat(payload.c);
      
      if (openPriceRef.current > 0) {
        setPriceChange(((p - openPriceRef.current) / openPriceRef.current) * 100);
      }
      return p;
    });

    setTickCount(n => n + 1);

    // Flash the browser tab title
    const p = payload.isTwelveData ? payload.price : parseFloat(payload.c);
    clearTimeout(lastFlashTimer.current);
    document.title = `${p.toFixed(2)} · ${currentAsset.label}`;
    lastFlashTimer.current = setTimeout(() => {
      document.title = `Dynamic Liquidity HeatMap Pro – ${currentAsset.label}`;
    }, 3000);
  }, [currentAsset.label, setCandles, currentInterval]);

  // ── WebSocket hooks ────────────────────────────────────────────
  useBinanceWS({
    symbol:   currentAsset.sym,
    interval: currentInterval,
    enabled:  wsEnabled && !isFallback && isBinance,
    onTick:   handleTick,
    onStatus: setWsStatus,
  });

  useTwelveDataWS({
    symbol:   currentAsset.sym,
    enabled:  wsEnabled && !isFallback && !isBinance,
    onTick:   handleTick,
    onStatus: setWsStatus,
  });

  // ── Asset change handler ───────────────────────────────────────
  const handleAssetChange = useCallback((asset) => {
    setCurrentAsset(asset);
    loadSymbol(asset, currentInterval);
  }, [currentInterval, loadSymbol]);

  // ── Interval change handler ────────────────────────────────────
  const handleIntervalChange = useCallback((iv) => {
    setCurrentInterval(iv);
    loadSymbol(currentAsset, iv);
  }, [currentAsset, loadSymbol]);

  // ── Overlay toggle handler ─────────────────────────────────────
  const handleOverlayToggle = useCallback((key, value) => {
    setOverlays(prev => ({ ...prev, [key]: value }));
  }, []);

  // ── View change from chart renderer ───────────────────────────
  const handleViewChange = useCallback((info) => {
    setViewInfo(info);
  }, []);

  // ── Derived last WS price for profile line ─────────────────────
  const lastWsPrice = livePrice;

  return (
    <div
      className="flex flex-col w-screen h-screen overflow-hidden"
      style={{ background: 'linear-gradient(150deg, #fffde6 0%, #fff8a8 45%, #fffccc 100%)' }}
    >
      {/* Top toolbar */}
      <Toolbar
        currentAsset={currentAsset}
        currentInterval={currentInterval}
        overlays={overlays}
        wsStatus={wsEnabled ? wsStatus : 'connecting'}
        livePrice={livePrice}
        priceChange={priceChange}
        hoveredCandle={hoveredCandle}
        onAssetChange={handleAssetChange}
        onIntervalChange={handleIntervalChange}
        onOverlayToggle={handleOverlayToggle}
      />

      {/* Status bar */}
      <StatusBar
        pocPrice={viewInfo.pocPrice}
        vahPrice={viewInfo.vahPrice}
        valPrice={viewInfo.valPrice}
        visibleCount={viewInfo.visibleCount}
        dateFrom={viewInfo.dateFrom}
        dateTo={viewInfo.dateTo}
        tickCount={tickCount}
        isFallback={isFallback}
      />

      {/* Chart area */}
      <div className="relative flex-1 overflow-hidden">
        <ChartCanvas
          candles={candles}
          lastWsPrice={lastWsPrice}
          currentIv={currentInterval}
          showPOC={overlays.showPOC}
          showLiq={overlays.showLiq}
          showVA={overlays.showVA}
          onHoverCandle={setHoveredCandle}
          onViewChange={handleViewChange}
        />

        {/* Loading overlay (sits inside chart area) */}
        <LoadingOverlay
          symbol={currentAsset.label}
          message={loading ? 'Fetching historical data…' : ''}
          visible={loading}
        />
      </div>
    </div>
  );
}
