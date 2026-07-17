/**
 * WsIndicator.jsx – Live / Connecting / Offline badge
 */
export function WsIndicator({ status }) {
  const configs = {
    connecting: { dot: 'bg-amber-400 dot-conn',  text: 'text-amber-600 bg-amber-50',   label: 'Connecting…' },
    live:       { dot: 'bg-green-400 dot-live',   text: 'text-green-700 bg-green-50',   label: 'Live'        },
    offline:    { dot: 'bg-red-400',              text: 'text-red-600   bg-red-50',      label: 'Offline'     },
  };
  const cfg = configs[status] ?? configs.connecting;
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold ${cfg.text} border border-current/10`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </div>
  );
}
