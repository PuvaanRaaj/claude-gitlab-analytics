import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { bucketCommits } from '../utils/dateHelpers'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-obs-surface border border-obs-border rounded-lg p-3 text-xs font-mono shadow-card">
      <p className="text-obs-muted mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
          <span className="text-obs-text">{p.name}:</span>
          <span className="text-obs-text-bright font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function CommitChart({ commits, claudeCommitIds, since, until, loading }) {
  if (loading) {
    return (
      <div className="bg-obs-surface border border-obs-border rounded-xl p-5">
        <div className="skeleton h-3 w-32 rounded mb-6" />
        <div className="skeleton h-48 w-full rounded" />
      </div>
    )
  }

  const data = bucketCommits(commits, claudeCommitIds, since, until)
  const hasData = data.some(d => d.claude > 0 || d.manual > 0)

  // For large ranges, only show every Nth label
  const tickInterval = data.length > 14 ? Math.ceil(data.length / 14) - 1 : 0

  return (
    <div className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-sans font-semibold text-obs-text-bright text-sm">Daily Commit Activity</h3>
          <p className="font-mono text-xs text-obs-text mt-0.5">AI-assisted vs manual commits</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-obs-cyan inline-block" />
            <span className="text-obs-text">AI</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-obs-amber inline-block" />
            <span className="text-obs-text">Manual</span>
          </span>
        </div>
      </div>

      {!hasData ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-obs-muted text-sm font-mono">No commits in this period</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barSize={data.length > 20 ? 6 : 12} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(26,32,53,0.8)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#4B5680', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={{ fill: '#4B5680', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={28}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="claude" name="Claude" stackId="a" fill="#00D4FF" radius={[0, 0, 0, 0]} />
            <Bar dataKey="manual" name="Manual" stackId="a" fill="#F59E0B" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
