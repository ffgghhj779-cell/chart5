/**
 * Toolbar.jsx – Top navigation bar
 * Composes: AssetSelector, IntervalSwitcher, OverlayToggles, WsIndicator, OHLCV display
 */
import { AssetSelector }    from './AssetSelector.jsx';
import { IntervalSwitcher } from './IntervalSwitcher.jsx';
import { OverlayToggles }   from './OverlayToggles.jsx';
import { WsIndicator }      from './WsIndicator.jsx';
import { fmtPrice }         from '../../utils/format.js';

function Sep() {
  return <div className="w-px h-6 bg-black/[0.10] flex-shrink-0" />;
}

export function Toolbar({
  currentAsset,
  currentInterval,
  overlays,
  wsStatus,
  livePrice,
  priceChange,
  hoveredCandle,
  onAssetChange,
  onIntervalChange,
  onOverlayToggle,
}) {
  const ub  = priceChange >= 0;
  const pct = (priceChange > 0 ? '+' : '') + priceChange.toFixed(2) + '%';

  return (
    <header className="h-11 flex-shrink-0 flex items-center gap-2 px-3 bg-white/70 backdrop-blur-xl border-b border-black/[0.07] shadow-sm z-20 select-none">

      {/* Asset selector */}
      <AssetSelector current={currentAsset} onChange={onAssetChange} />

      <Sep />

      {/* Interval switcher */}
      <IntervalSwitcher current={currentInterval} onChange={onIntervalChange} />

      <Sep />

      {/* Overlay toggles */}
      <OverlayToggles values={overlays} onChange={onOverlayToggle} />

      <Sep />

      {/* Chart label */}
      <span className="text-[10px] text-gray-400 whitespace-nowrap hidden lg:block">
        Dynamic Liquidity HeatMap · VRVP
      </span>

      {/* WS status */}
      <WsIndicator status={wsStatus} />

      {/* ── Live price (right-aligned) ── */}
      <div className="ml-auto flex items-center gap-2.5">
        {livePrice > 0 && (
          <>
            <span className="font-mono text-[15px] font-semibold text-gray-900 tracking-tight">
              {fmtPrice(livePrice)}
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
              ub ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-600'
            }`}>
              {pct}
            </span>
          </>
        )}

        <Sep />

        {/* OHLCV row — shows hovered candle, else latest */}
        {hoveredCandle && (
          <div className="flex items-center gap-2 text-[10.5px]">
            <span className="text-gray-400 text-[9.5px]">OHLCV</span>
            {[
              ['O', fmtPrice(hoveredCandle.o), 'text-gray-700'],
              ['H', fmtPrice(hoveredCandle.h), 'text-teal-600'],
              ['L', fmtPrice(hoveredCandle.l), 'text-red-500'],
              ['C', fmtPrice(hoveredCandle.c), hoveredCandle.c >= hoveredCandle.o ? 'text-teal-600' : 'text-red-500'],
            ].map(([k, v, cls]) => (
              <span key={k} className="flex items-center gap-0.5">
                <span className="text-gray-400 text-[9px]">{k}</span>
                <b className={`font-semibold ${cls}`}>{v}</b>
              </span>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
