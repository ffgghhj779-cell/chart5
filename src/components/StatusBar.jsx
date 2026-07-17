/**
 * StatusBar.jsx – Thin info strip below the toolbar
 * Shows: POC price, VAH, VAL, visible range, tick counter, last update time
 */
import { fmtPrice } from '../utils/format.js';

function Sep() {
  return <div className="w-px h-3 bg-black/[0.10]" />;
}

function Item({ label, value, valueClass = 'text-gray-600' }) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-gray-400">{label}</span>
      <span className={`font-semibold ${valueClass}`}>{value || '—'}</span>
    </span>
  );
}

export function StatusBar({ pocPrice, vahPrice, valPrice, visibleCount, dateFrom, dateTo, tickCount, isFallback }) {
  const fmtD = (ts) => ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="h-[21px] flex-shrink-0 flex items-center gap-2.5 px-3 bg-white/40 border-b border-black/[0.05] text-[9.5px] text-gray-500 z-10 overflow-hidden">

      <Item label="POC"  value={pocPrice  ? fmtPrice(pocPrice)  : null} valueClass="text-amber-600 font-bold" />
      <Sep />
      <Item label="VAH"  value={vahPrice  ? fmtPrice(vahPrice)  : null} valueClass="text-amber-500" />
      <Item label="VAL"  value={valPrice  ? fmtPrice(valPrice)  : null} valueClass="text-teal-600"  />
      <Sep />
      <Item label="Visible" value={visibleCount ? `${visibleCount} candles` : null} />
      {dateFrom && dateTo && (
        <span className="italic text-gray-400">{fmtD(dateFrom)} – {fmtD(dateTo)}</span>
      )}
      <Sep />
      <Item label="Ticks" value={String(tickCount)} valueClass="text-blue-600 font-bold" />

      {isFallback && (
        <>
          <Sep />
          <span className="text-amber-500 font-semibold">⚠ Offline — synthetic data</span>
        </>
      )}

      <span className="ml-auto text-gray-400 italic hidden md:block">
        Dynamic Liquidity HeatMap Pro · Live WebSocket VRVP
      </span>
    </div>
  );
}
