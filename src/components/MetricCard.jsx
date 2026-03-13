export default function MetricCard({ label, value, sub, pct, icon, accent = 'cyan', loading, delay = 0 }) {
  const accentColors = {
    cyan:   { text: 'text-obs-cyan',   border: 'border-obs-cyan',   glow: 'shadow-cyan-glow',  bg: 'bg-obs-cyan/10'  },
    amber:  { text: 'text-obs-amber',  border: 'border-obs-amber',  glow: 'shadow-amber-glow', bg: 'bg-obs-amber/10' },
    green:  { text: 'text-green-400',  border: 'border-green-500',  glow: '',                   bg: 'bg-green-500/10' },
    purple: { text: 'text-purple-400', border: 'border-purple-500', glow: '',                   bg: 'bg-purple-500/10'},
  }
  const c = accentColors[accent]

  if (loading) {
    return (
      <div className="bg-obs-surface border border-obs-border rounded-xl p-5">
        <div className="skeleton h-3 w-24 rounded mb-4" />
        <div className="skeleton h-8 w-16 rounded mb-2" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
    )
  }

  const pctPositive = pct !== null && pct !== undefined && pct >= 0
  const pctLabel = pct !== null && pct !== undefined
    ? `${pct >= 0 ? '+' : ''}${pct}% vs prev`
    : null

  return (
    <div
      className={`animate-fade-up bg-obs-surface border ${c.border}/30 rounded-xl p-5 relative overflow-hidden
        hover:border-${accent === 'cyan' ? 'obs-cyan' : accent === 'amber' ? 'obs-amber' : accent === 'green' ? 'green-500' : 'purple-500'}/50
        transition-all duration-300 group`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      {/* Background glow */}
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 ${c.bg} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />

      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <span className="font-mono text-xs text-obs-text uppercase tracking-widest leading-none">{label}</span>
        {icon && (
          <div className={`w-7 h-7 rounded-md ${c.bg} border ${c.border}/20 flex items-center justify-center flex-shrink-0`}>
            <span className={`${c.text} text-xs`}>{icon}</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className={`font-mono font-semibold text-3xl ${c.text} leading-none mb-2`}>
        {value ?? '—'}
      </div>

      {/* Sub + pct */}
      <div className="flex items-center gap-2 flex-wrap">
        {sub && <span className="font-mono text-xs text-obs-text">{sub}</span>}
        {pctLabel && (
          <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${
            pctPositive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
          }`}>
            {pctLabel}
          </span>
        )}
      </div>
    </div>
  )
}
