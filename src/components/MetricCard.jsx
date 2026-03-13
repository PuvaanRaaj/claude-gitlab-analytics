export default function MetricCard({ label, value, sub, pct, accent = 'cyan', loading = false, delay = 0, icon }) {
  const accentMap = {
    cyan:   { color: '#00C9FF', bg: 'rgba(0,201,255,0.06)',   border: 'rgba(0,201,255,0.15)',  text: 'text-[#00C9FF]' },
    purple: { color: '#A78BFA', bg: 'rgba(167,139,250,0.06)', border: 'rgba(167,139,250,0.15)', text: 'text-[#A78BFA]' },
    green:  { color: '#22C55E', bg: 'rgba(34,197,94,0.06)',   border: 'rgba(34,197,94,0.15)',  text: 'text-[#22C55E]' },
    amber:  { color: '#F4A024', bg: 'rgba(244,160,36,0.06)',  border: 'rgba(244,160,36,0.15)', text: 'text-[#F4A024]' },
  }
  const a = accentMap[accent] || accentMap.cyan

  const pctPositive = pct !== null && pct !== undefined && pct >= 0
  const pctLabel = pct !== null && pct !== undefined
    ? `${pct >= 0 ? '+' : ''}${pct}% vs prev`
    : null

  return (
    <div
      className="relative bg-obs-surface border border-obs-border rounded-xl p-4 overflow-hidden card-hover animate-fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl" style={{ background: `linear-gradient(90deg, transparent, ${a.color}40, transparent)` }} />
      {/* Left accent bar */}
      <div className="absolute left-0 top-4 bottom-4 w-[2px] rounded-full" style={{ background: a.color, opacity: 0.6 }} />

      <div className="pl-3">
        <div className="flex items-center justify-between mb-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-obs-muted">{label}</p>
          {icon && <span className="text-sm opacity-40" style={{ color: a.color }}>{icon}</span>}
        </div>

        {loading ? (
          <div className="skeleton h-7 w-20 rounded mb-1" />
        ) : (
          <p className={`font-display font-semibold text-2xl leading-none mb-1.5 stat-animate ${a.text}`}>{value ?? '—'}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {sub && <p className="font-mono text-[10px] text-obs-muted leading-tight">{sub}</p>}
          {pctLabel && (
            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
              pctPositive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
            }`}>
              {pctLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
