import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { format, parseISO, eachDayOfInterval } from 'date-fns'

const STATUS_COLOR = {
  success:  '#22C55E',
  failed:   '#EF4444',
  canceled: '#4B5680',
  skipped:  '#4B5680',
  running:  '#00D4FF',
  pending:  '#F59E0B',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-obs-surface border border-obs-border rounded-lg p-3 text-xs font-mono shadow-card">
      <p className="text-obs-muted mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill || p.stroke }} />
          <span className="text-obs-text">{p.name}:</span>
          <span className="text-obs-text-bright font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function PipelineChart({ pipelines, since, until, loading }) {
  if (loading) {
    return (
      <div className="bg-obs-surface border border-obs-border rounded-xl p-5">
        <div className="skeleton h-3 w-40 rounded mb-6" />
        <div className="skeleton h-48 w-full rounded" />
      </div>
    )
  }

  const hasData = pipelines.length > 0

  // Status breakdown
  const statusCounts = {}
  pipelines.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
  })
  const successRate = pipelines.length > 0
    ? Math.round(((statusCounts.success || 0) / pipelines.length) * 100)
    : 0

  // Daily pass/fail buckets
  const days = since && until
    ? eachDayOfInterval({ start: new Date(since), end: new Date(until) })
    : []
  const bucketMap = {}
  days.forEach(d => {
    const key = format(d, 'MMM d')
    bucketMap[key] = { date: key, success: 0, failed: 0, other: 0, rate: null }
  })

  pipelines.forEach(p => {
    const dateStr = p.created_at || p.updated_at
    if (!dateStr) return
    try {
      const key = format(parseISO(dateStr), 'MMM d')
      if (!bucketMap[key]) bucketMap[key] = { date: key, success: 0, failed: 0, other: 0, rate: null }
      if (p.status === 'success') bucketMap[key].success++
      else if (p.status === 'failed') bucketMap[key].failed++
      else bucketMap[key].other++
    } catch {}
  })

  // Compute daily pass rate
  const data = Object.values(bucketMap).map(b => {
    const total = b.success + b.failed + b.other
    return { ...b, rate: total > 0 ? Math.round((b.success / total) * 100) : null }
  })

  // Avg duration
  const durations = pipelines.filter(p => p.duration > 0).map(p => p.duration)
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
    : 0

  const tickInterval = data.length > 14 ? Math.ceil(data.length / 14) - 1 : 0

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total pipelines', value: pipelines.length, color: 'text-obs-text-bright' },
          { label: 'Pass rate',       value: `${successRate}%`, color: successRate >= 80 ? 'text-green-400' : successRate >= 60 ? 'text-obs-amber' : 'text-red-400' },
          { label: 'Successful',      value: statusCounts.success || 0,  color: 'text-green-400' },
          { label: 'Failed',          value: statusCounts.failed  || 0,  color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-obs-surface border border-obs-border rounded-xl p-4">
            <div className={`font-mono text-2xl font-semibold ${color} mb-1`}>{value}</div>
            <div className="font-mono text-xs text-obs-muted">{label}</div>
          </div>
        ))}
      </div>

      {/* Daily pass/fail chart */}
      <div className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-sans font-semibold text-obs-text-bright text-sm">Pipeline Health</h3>
            <p className="font-mono text-xs text-obs-muted mt-0.5">Daily success / failure count</p>
          </div>
          {avgDuration > 0 && (
            <span className="font-mono text-xs text-obs-muted bg-obs-card border border-obs-border px-2.5 py-1 rounded-lg">
              avg duration: <span className="text-obs-cyan">{Math.floor(avgDuration / 60)}m {avgDuration % 60}s</span>
            </span>
          )}
        </div>

        {!hasData ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-obs-muted text-sm font-mono">No pipeline data in this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} barSize={data.length > 20 ? 5 : 10} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(26,32,53,0.8)" />
              <XAxis dataKey="date" tick={{ fill: '#4B5680', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval={tickInterval} />
              <YAxis tick={{ fill: '#4B5680', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="success" name="Success" stackId="a" fill="#22C55E" radius={[0,0,0,0]} />
              <Bar dataKey="failed"  name="Failed"  stackId="a" fill="#EF4444" radius={[0,0,0,0]} />
              <Bar dataKey="other"   name="Other"   stackId="a" fill="#4B5680" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pass rate trend */}
      {hasData && (
        <div className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          <div className="mb-5">
            <h3 className="font-sans font-semibold text-obs-text-bright text-sm">Pass Rate Trend</h3>
            <p className="font-mono text-xs text-obs-muted mt-0.5">Daily pipeline success rate (%)</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.filter(d => d.rate !== null)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(26,32,53,0.8)" />
              <XAxis dataKey="date" tick={{ fill: '#4B5680', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval={tickInterval} />
              <YAxis domain={[0, 100]} tick={{ fill: '#4B5680', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={36} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)' }} />
              <Line type="monotone" dataKey="rate" name="Pass rate %" stroke="#22C55E" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#22C55E', stroke: '#080B14', strokeWidth: 2 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Status breakdown */}
      {hasData && (
        <div className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
          <h3 className="font-sans font-semibold text-obs-text-bright text-sm mb-4">Status Breakdown</h3>
          <div className="space-y-2.5">
            {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
              const pct = Math.round((count / pipelines.length) * 100)
              const color = STATUS_COLOR[status] || '#4B5680'
              return (
                <div key={status}>
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-xs capitalize" style={{ color }}>{status}</span>
                    <span className="font-mono text-xs text-obs-muted">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-obs-border rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
