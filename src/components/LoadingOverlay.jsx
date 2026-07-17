/**
 * LoadingOverlay.jsx – Full-screen loading spinner shown while fetching data
 */
export function LoadingOverlay({ symbol, message, visible }) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center z-[300] gap-4 transition-opacity duration-350 bg-[rgba(255,253,220,0.9)] ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Spinner */}
      <div className="w-10 h-10 rounded-full border-[3px] border-blue-100 border-t-blue-500 animate-spin" />

      {/* Symbol */}
      <p className="text-[16px] font-bold text-gray-700">{symbol}</p>

      {/* Message */}
      <p className="text-[11px] text-gray-400">{message || 'Fetching historical data…'}</p>
    </div>
  );
}
