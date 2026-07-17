/**
 * IntervalSwitcher.jsx – 1M / 5M / 15M / 1H / 4H / 1D / 1W buttons
 */
import { INTERVAL_OPTIONS } from '../../constants/assets.js';

export function IntervalSwitcher({ current, onChange }) {
  return (
    <div className="flex gap-0.5 bg-black/[0.055] p-0.5 rounded-md">
      {INTERVAL_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`text-[10px] font-bold px-2 py-1 rounded transition-all duration-150 ${
            current === value
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-800 hover:bg-black/[0.07]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
