/**
 * OverlayToggles.jsx – POC / Liq Zones / Value Area toggle buttons
 */
const TOGGLES = [
  { key: 'showPOC', label: 'POC',           onColor: 'bg-amber-500  border-amber-600'  },
  { key: 'showLiq', label: 'Liq Zones',     onColor: 'bg-blue-500   border-blue-600'   },
  { key: 'showVA',  label: 'Value Area 70%',onColor: 'bg-teal-500   border-teal-600'   },
];

export function OverlayToggles({ values, onChange }) {
  return (
    <div className="flex gap-1">
      {TOGGLES.map(({ key, label, onColor }) => {
        const on = values[key];
        return (
          <button
            key={key}
            onClick={() => onChange(key, !on)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-semibold border transition-all duration-150 ${
              on
                ? `${onColor} text-white`
                : 'bg-black/[0.045] border-transparent text-gray-500 hover:bg-black/[0.09]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-white/70' : 'bg-current opacity-50'}`} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
