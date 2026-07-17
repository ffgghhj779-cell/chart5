/**
 * format.js – All number and date formatting helpers
 */

/**
 * Format a price with thousands separators.
 * Prices >= 1000 → 0 decimals; < 1 → 4 decimals; else 2.
 */
export function fmtPrice(p) {
  if (p == null || isNaN(p)) return '—';
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p < 1)     return p.toFixed(4);
  return p.toFixed(2);
}

/**
 * Format a volume number with B / M / K suffixes.
 */
export function fmtVol(v) {
  if (v == null || isNaN(v)) return '—';
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(0);
}

/**
 * Short date/time for the X-axis label depending on interval.
 */
export function fmtAxisDate(ts, interval) {
  const d = new Date(ts);
  if (interval === '1d' || interval === '1w') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
}

/**
 * Full date string for the tooltip header.
 */
export function fmtFullDate(ts, interval) {
  const d = new Date(ts);
  if (interval === '1d' || interval === '1w') {
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
}

/**
 * Month + 2-digit year, e.g. "Jan '25" — used for axis month labels.
 */
export function fmtMonthYear(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
