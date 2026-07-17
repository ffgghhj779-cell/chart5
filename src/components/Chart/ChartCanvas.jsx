/**
 * ChartCanvas.jsx
 * Renders all six canvas layers + DOM overlays.
 * Connects to useChartRenderer for all drawing logic.
 */
import { useRef, useCallback, useState } from 'react';
import { useChartRenderer } from '../../hooks/useChartRenderer.js';
import { fmtPrice, fmtVol, fmtFullDate } from '../../utils/format.js';

// ── Tooltip component ──────────────────────────────────────────────
function Tooltip({ candle, pos, interval }) {
  if (!candle || !pos) return null;
  const ub  = candle.c >= candle.o;
  const pct = ((candle.c - candle.o) / candle.o * 100);
  const col = ub ? '#26a69a' : '#ef5350';
  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{ left: pos.x + 16, top: pos.y + 14 }}
    >
      <div className="bg-[rgba(14,14,22,0.93)] text-gray-200 text-[11px] px-3 py-2 rounded-lg border border-white/10 shadow-2xl min-w-[155px] leading-relaxed backdrop-blur-sm">
        <div className="text-[9.5px] text-gray-500 italic mb-1">{fmtFullDate(candle.t, interval)}</div>
        <div className="font-bold text-[13px] mb-1.5" style={{ color: col }}>
          {ub ? '▲' : '▼'} {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
        </div>
        <div className="flex justify-between gap-4"><span className="text-gray-500 text-[10px]">Open</span>  <span className="font-mono text-[11px]">{fmtPrice(candle.o)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-gray-500 text-[10px]">High</span>  <span className="font-mono text-[11px]" style={{ color: '#26a69a' }}>{fmtPrice(candle.h)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-gray-500 text-[10px]">Low</span>   <span className="font-mono text-[11px]" style={{ color: '#ef5350' }}>{fmtPrice(candle.l)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-gray-500 text-[10px]">Close</span> <span className="font-mono text-[11px]">{fmtPrice(candle.c)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-gray-500 text-[10px]">Vol</span>   <span className="font-mono text-[11px]">{fmtVol(candle.v)}</span></div>
      </div>
    </div>
  );
}

// ── ChartCanvas ────────────────────────────────────────────────────
export function ChartCanvas({ candles, lastWsPrice, currentIv, showPOC, showLiq, showVA, onHoverCandle, onViewChange }) {
  const wrapRef = useRef(null);

  const canvasRefs = {
    bg:   useRef(null),
    grid: useRef(null),
    main: useRef(null),
    vol:  useRef(null),
    prof: useRef(null),
    ov:   useRef(null),
  };

  const [hoveredCandle, setHoveredCandle] = useState(null);
  const [mousePos,      setMousePos]      = useState(null);

  const handleHover = useCallback((candle) => {
    setHoveredCandle(candle);
    if (onHoverCandle) onHoverCandle(candle);
  }, [onHoverCandle]);

  const data = { candles, lastWsPrice, currentIv, showPOC, showLiq, showVA };
  const handlers = useChartRenderer(canvasRefs, wrapRef, data, handleHover, onViewChange);

  // Track mouse position for tooltip placement
  const handleMouseMove = useCallback((e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - r.left, y: e.clientY - r.top });
    handlers.onMouseMove(e);
  }, [handlers]);

  const handleMouseLeave = useCallback((e) => {
    setHoveredCandle(null);
    setMousePos(null);
    handlers.onMouseLeave(e);
  }, [handlers]);

  const canvasStyle = { position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated' };

  return (
    <div ref={wrapRef} className="absolute inset-0 w-full h-full overflow-hidden cursor-crosshair select-none touch-none">

      {/* Canvas stack — each layer painted independently */}
      <canvas ref={canvasRefs.bg}   style={canvasStyle} />
      <canvas ref={canvasRefs.grid} style={canvasStyle} />
      <canvas ref={canvasRefs.main} style={canvasStyle} />
      <canvas ref={canvasRefs.vol}  style={canvasStyle} />
      <canvas ref={canvasRefs.prof} style={canvasStyle} />

      {/* Overlay canvas — captures all pointer events */}
      <canvas
        ref={canvasRefs.ov}
        style={canvasStyle}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handlers.onMouseDown}
        onMouseUp={handlers.onMouseUp}
        onWheel={handlers.onWheel}
        onTouchStart={handlers.onTouchStart}
        onTouchMove={handlers.onTouchMove}
        onTouchEnd={handlers.onTouchEnd}
        onTouchCancel={handlers.onTouchCancel}
      />

      {/* DOM Tooltip */}
      {hoveredCandle && mousePos && (
        <Tooltip candle={hoveredCandle} pos={mousePos} interval={currentIv} />
      )}

      {/* Watermark */}
      <div className="absolute top-1/2 left-[44%] -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold tracking-[2px] text-black/[0.035] pointer-events-none select-none uppercase whitespace-nowrap z-0">
        Dynamic Liquidity HeatMap Profile
      </div>

      {/* Info badges top-left */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-3 text-[9px] text-black/40 pointer-events-none z-10 bg-white/50 px-2.5 py-1 rounded border border-black/[0.05]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ff9800] inline-block" />POC</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400/40 inline-block" />VA 70%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#26a69a] inline-block" />VAL</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ff9800]/60 inline-block" />VAH</span>
      </div>

      {/* Bottom legend */}
      <div className="absolute bottom-7 left-3 flex gap-3 text-[9.5px] text-gray-500 z-10 pointer-events-none bg-white/55 border border-black/[0.06] rounded px-2 py-1">
        {[['#26a69a','Bull'],['#ef5350','Bear'],['rgba(91,155,213,.8)','Upper Liq'],['rgba(38,166,154,.8)','Lower Liq'],['#ff9800','POC']].map(([c,l]) => (
          <span key={l} className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
