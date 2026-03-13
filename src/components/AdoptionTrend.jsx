import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import { parseISO, startOfWeek, format } from 'date-fns'

function buildWeeklyBuckets(taggedCommits) {
  const map = new Map() // weekKey -> { label, total, ai }

  for (const { commit, isClaudeAssisted } of taggedCommits) {
    const raw = commit.authored_date || commit.created_at
    if (!raw) continue
    let d
    try { d = parseISO(raw) } catch { continue }
    const weekStart = startOfWeek(d, { weekStartsOn: 1 })
    const key = format(weekStart, 'yyyy-MM-dd')
    const label = format(weekStart, 'MMM d')
    if (!map.has(key)) map.set(key, { key, label, total: 0, ai: 0 })
    const bucket = map.get(key)
    bucket.total++
    if (isClaudeAssisted) bucket.ai++
  }

  return Array.from(map.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(b => ({
      ...b,
      manual: b.total - b.ai,
      aiPct: b.total > 0 ? Math.round((b.ai / b.total) * 100) : 0,
    }))
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload.find(p => p.dataKey === 'total')?.value ?? 0
  const ai = payload.find(p => p.dataKey === 'ai')?.value ?? 0
  const pct = payload.find(p => p.dataKey === 'aiPct')?.value ?? 0
  return (
    <div className="bg-obs-surface border border-obs-border rounded-lg p-3 text-xs font-mono shadow-lg">
      <p className="text-obs-muted mb-2 font-semibold">Week of {label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-obs-amber inline-block flex-shrink-0" />
          <span className="text-obs-text">Total:</span>
          <span className="text-obs-text-bright font-semibold">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-obs-cyan inline-block flex-shrink-0" />
          <span className="text-obs-text">AI commits:</span>
          <span className="text-obs-text-bright font-semibold">{ai}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-obs-cyan inline-block flex-shrink-0" />
          <span className="text-obs-text">AI %:</span>
          <span className="text-obs-text-bright font-semibold">{pct}%</span>
        </div>
      </div>
    </div>
  )
}

export default function AdoptionTrend({ taggedCommits = [], loading }) {
  if (loading) {
    return (
      <div className="bg-obs-surface border border-obs-border rounded-xl p-5">
        <div className="skeleton h-3 w-32 rounded mb-4" />
        <div className="skeleton h-48 w-full rounded" />
      </div>
    )
  }

  const data = buildWeeklyBuckets(taggedCommits)
  const totalAI = taggedCommits.filter(t => t.isClaudeAssisted).length
  const overallPct = taggedCommits.length > 0
    ? Math.round((totalAI / taggedCommits.length) * 100)
    : 0

  if (data.length < 2) {
    return (
      <div
        className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up"
        style={{ animationDelay: '200ms', animationFillMode: 'both' }}
      >
        <div className="mb-4">
          <h3 className="font-sans font-semibold text-obs-text-bright text-sm">AI Adoption Trend</h3>
          <p className="font-mono text-xs text-obs-text mt-0.5">Weekly AI-assisted commit percentage</p>
        </div>
        <div className="h-40 flex items-center justify-center">
          <p className="text-obs-muted text-sm font-mono">Not enough data for trend</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up"
      style={{ animationDelay: '200ms', animationFillMode: 'both' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-sans font-semibold text-obs-text-bright text-sm">AI Adoption Trend</h3>
          <p className="font-mono text-xs text-obs-text mt-0.5">Weekly AI-assisted commit percentage</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-obs-amber inline-block" />
            <span className="text-obs-text">Total</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 rounded-sm bg-obs-cyan inline-block" />
            <span className="text-obs-text">AI %</span>
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} barSize={18}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(26,32,53,0.8)" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#4B5680', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
          />
          {/* Left Y — commit count */}
          <YAxis
            yAxisId="left"
            tick={{ fill: '#4B5680', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={28}
          />
          {/* Right Y — AI % */}
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tickFormatter={v => `${v}%`}
            tick={{ fill: '#4B5680', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <ReferenceLine
            yAxisId="right"
            y={overallPct}
            stroke="#00D4FF"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{
              value: `avg ${overallPct}%`,
              fill: '#00D4FF',
              fontSize: 10,
              fontFamily: 'JetBrains Mono',
              position: 'insideTopRight',
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="total"
            name="Total"
            fill="#F59E0B"
            fillOpacity={0.55}
            radius={[3, 3, 0, 0]}
            isAnimationActive
            animationBegin={200}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="aiPct"
            name="AI %"
            stroke="#00D4FF"
            strokeWidth={2}
            dot={{ fill: '#00D4FF', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            isAnimationActive
            animationBegin={200}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
