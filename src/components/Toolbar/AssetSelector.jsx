/**
 * AssetSelector.jsx
 * Searchable dropdown for switching between crypto pairs and gold tokens.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { ASSETS } from '../../constants/assets.js';

export function AssetSelector({ current, onChange }) {
  const [open,   setOpen]   = useState(false);
  const [query,  setQuery]  = useState('');
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openDropdown = useCallback(() => {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  const selectAsset = useCallback((asset) => {
    onChange(asset);
    setOpen(false);
  }, [onChange]);

  // Filter assets by query
  const q = query.toLowerCase();
  const filtered = ASSETS.filter(a =>
    !q ||
    a.sym.toLowerCase().includes(q) ||
    a.label.toLowerCase().includes(q) ||
    a.desc.toLowerCase().includes(q)
  );

  // Group by category
  const categories = [...new Set(filtered.map(a => a.cat))];

  return (
    <div ref={wrapRef} className="relative flex-shrink-0">
      {/* Trigger button */}
      <button
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-150 min-w-[135px] border ${
          open
            ? 'bg-blue-50 border-blue-400'
            : 'bg-blue-50/70 border-blue-200/60 hover:border-blue-400/60 hover:bg-blue-50'
        }`}
      >
        <span className="text-lg leading-none">{current.icon}</span>
        <span className="text-[12px] font-bold text-blue-800 flex-1 text-left">{current.label}</span>
        <span className={`text-[9px] text-blue-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 w-72 bg-white rounded-xl border border-black/10 shadow-2xl z-[500] overflow-hidden dd-open">

          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-black/[0.07]">
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setOpen(false)}
              placeholder="Search symbol or name…"
              className="flex-1 text-[12px] outline-none bg-transparent text-gray-700 placeholder-gray-300"
            />
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-1">
            {categories.length === 0 && (
              <div className="px-4 py-5 text-center text-[11px] text-gray-400">No results found</div>
            )}
            {categories.map(cat => (
              <div key={cat}>
                <div className="px-3 pt-2 pb-1 text-[9.5px] font-bold text-gray-400 uppercase tracking-widest">{cat}</div>
                {filtered.filter(a => a.cat === cat).map(asset => {
                  const isActive = asset.sym === current.sym;
                  // Deterministic fake 24h % from symbol chars
                  const seed  = asset.sym.charCodeAt(0) + asset.sym.charCodeAt(1);
                  const pct   = (((seed * 17) % 1200 - 600) / 100).toFixed(2);
                  const isPos = parseFloat(pct) >= 0;
                  return (
                    <button
                      key={asset.sym}
                      onClick={() => selectAsset(asset)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 transition-colors duration-100 ${
                        isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xl w-6 text-center leading-none flex-shrink-0">{asset.icon}</span>
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-[12px] font-bold text-gray-800">{asset.label}</div>
                        <div className="text-[9.5px] text-gray-400 truncate">{asset.desc}</div>
                      </div>
                      <span className={`text-[11px] font-semibold flex-shrink-0 ${isPos ? 'text-teal-600' : 'text-red-500'}`}>
                        {isPos ? '+' : ''}{pct}%
                      </span>
                    </button>
                  );
                })}
                <div className="h-px bg-gray-100 mx-2 my-0.5" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
