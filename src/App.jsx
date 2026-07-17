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
import { DEFAULT_ASSET }  from './constants/assets.js';

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

  // ── REST data hook ─────────────────────────────────────────────
  const { candles, setCandles, loading, fetchCandles } = useBinanceREST();

  // ── Load symbol helper ─────────────────────────────────────────
  const loadSymbol = useCallback(async (asset, interval) => {
    setWsEnabled(false);
    setTickCount(0);
    setLivePrice(0);
    setPriceChange(0);
    setHoveredCandle(null);

    const result = await fetchCandles(asset.sym, interval);
    setIsFallback(!result.ok);

    if (result.data.length > 0) {
      const last = result.data[result.data.length - 1];
      openPriceRef.current = result.data[0].c;
      setLivePrice(last.c);
      setPriceChange(((last.c - result.data[0].o) / result.data[0].o) * 100);
    }

    // Enable WS after data is ready
    setWsEnabled(true);
  }, [fetchCandles]);

  // ── Initial load ───────────────────────────────────────────────
  useEffect(() => {
    loadSymbol(DEFAULT_ASSET, '1d');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── WebSocket tick handler ─────────────────────────────────────
  const handleTick = useCallback((k) => {
    // k is raw Binance kline object from WS message
    const newCandle = {
      t: k.t,
      o: parseFloat(k.o),
      h: parseFloat(k.h),
      l: parseFloat(k.l),
      c: parseFloat(k.c),
      v: parseFloat(k.v),
    };

    setCandles(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.t === newCandle.t) {
        // Update existing last candle in-place
        const next = [...prev];
        next[next.length - 1] = newCandle;
        return next;
      } else if (newCandle.t > last.t) {
        // New candle formed
        return [...prev, newCandle];
      }
      return prev;
    });

    // Update live price display
    setLivePrice(newCandle.c);
    if (openPriceRef.current > 0) {
      setPriceChange(((newCandle.c - openPriceRef.current) / openPriceRef.current) * 100);
    }

    setTickCount(n => n + 1);

    // Flash the browser tab title
    clearTimeout(lastFlashTimer.current);
    const arrow = newCandle.c >= newCandle.o ? '▲' : '▼';
    document.title = `${arrow} ${newCandle.c.toFixed(2)} · ${currentAsset.label}`;
    lastFlashTimer.current = setTimeout(() => {
      document.title = `Dynamic Liquidity HeatMap Pro – ${currentAsset.label}`;
    }, 3000);
  }, [currentAsset.label, setCandles]);

  // ── WebSocket hook ─────────────────────────────────────────────
  useBinanceWS({
    symbol:   currentAsset.sym,
    interval: currentInterval,
    enabled:  wsEnabled && !isFallback,
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
