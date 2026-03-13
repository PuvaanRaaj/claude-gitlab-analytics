import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { bucketCommits } from '../utils/dateHelpers'
import { format, parseISO } from 'date-fns'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-obs-surface border border-obs-border rounded-lg p-3 text-xs font-mono shadow-card">
      <p className="text-obs-muted mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.stroke }} />
          <span className="text-obs-text">{p.name}:</span>
          <span className="text-obs-text-bright font-semibold">{p.value?.toFixed(1)} files</span>
        </div>
      ))}
    </div>
  )
}

export default function FilesChart({ taggedCommits, since, until, avgFilesChanged, loading }) {
  if (loading) {
    return (
      <div className="bg-obs-surface border border-obs-border rounded-xl p-5">
        <div className="skeleton h-3 w-40 rounded mb-6" />
        <div className="skeleton h-48 w-full rounded" />
      </div>
    )
  }

  // Build weekly buckets for a smoother line
  const bucketMap = {}

  taggedCommits.forEach(({ commit, isClaudeAssisted, filesChanged }) => {
    const dateStr = commit.created_at || commit.authored_date
    if (!dateStr) return
    const week = format(parseISO(dateStr), 'MMM d')
    if (!bucketMap[week]) bucketMap[week] = { date: week, claudeSum: 0, claudeCount: 0, manualSum: 0, manualCount: 0 }
    if (isClaudeAssisted) {
      bucketMap[week].claudeSum += filesChanged
      bucketMap[week].claudeCount++
    } else {
      bucketMap[week].manualSum += filesChanged
      bucketMap[week].manualCount++
    }
  })

  const data = Object.values(bucketMap).map(b => ({
    date: b.date,
    claude: b.claudeCount > 0 ? parseFloat((b.claudeSum / b.claudeCount).toFixed(1)) : null,
    manual: b.manualCount > 0 ? parseFloat((b.manualSum / b.manualCount).toFixed(1)) : null,
  }))

  const hasData = data.length > 0

  return (
    <div className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-sans font-semibold text-obs-text-bright text-sm">Files Changed per Commit</h3>
          <p className="font-mono text-xs text-obs-text mt-0.5">Moving average — AI vs manual</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-obs-cyan inline-block" />
            <span className="text-obs-text">Claude</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-obs-amber inline-block" />
            <span className="text-obs-text">Manual</span>
          </span>
        </div>
      </div>

      {!hasData ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-obs-muted text-sm font-mono">No commit data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(26,32,53,0.8)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#4B5680', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#4B5680', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }} />
            {avgFilesChanged > 0 && (
              <ReferenceLine
                y={avgFilesChanged}
                stroke="rgba(255,255,255,0.1)"
                strokeDasharray="4 4"
                label={{ value: 'avg', fill: '#4B5680', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="claude"
              name="Claude"
              stroke="#00D4FF"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#00D4FF', stroke: '#080B14', strokeWidth: 2 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="manual"
              name="Manual"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#F59E0B', stroke: '#080B14', strokeWidth: 2 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
