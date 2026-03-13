import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { eachDayOfInterval } from 'date-fns'

function buildDailyLineBuckets(since, until) {
  const days = eachDayOfInterval({ start: new Date(since), end: new Date(until) })
  return days.map(d => ({
    date:    format(d, 'MMM d'),
    dateISO: format(d, 'yyyy-MM-dd'),
    claudeAdd: 0,
    claudeDel: 0,
    manualAdd: 0,
    manualDel: 0,
  }))
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const byKey = Object.fromEntries(payload.map(p => [p.dataKey, p.value]))
  const claudeNet = (byKey.claudeAdd ?? 0) - (byKey.claudeDel ?? 0)
  const manualNet = (byKey.manualAdd ?? 0) - (byKey.manualDel ?? 0)
  return (
    <div className="bg-obs-surface border border-obs-border rounded-lg p-3 text-xs font-mono shadow-card min-w-[170px]">
      <p className="text-obs-muted mb-2">{label}</p>
      <div className="space-y-1">
        <p className="text-obs-cyan font-semibold">Claude</p>
        <div className="flex justify-between gap-4">
          <span className="text-green-400">+{byKey.claudeAdd ?? 0}</span>
          <span className="text-red-400">−{byKey.claudeDel ?? 0}</span>
          <span className={`${claudeNet >= 0 ? 'text-obs-cyan' : 'text-obs-muted'}`}>
            net {claudeNet >= 0 ? '+' : ''}{claudeNet}
          </span>
        </div>
        <p className="text-obs-amber font-semibold mt-1">Manual</p>
        <div className="flex justify-between gap-4">
          <span className="text-green-400">+{byKey.manualAdd ?? 0}</span>
          <span className="text-red-400">−{byKey.manualDel ?? 0}</span>
          <span className={`${manualNet >= 0 ? 'text-obs-amber' : 'text-obs-muted'}`}>
            net {manualNet >= 0 ? '+' : ''}{manualNet}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function LinesChart({ taggedCommits, since, until, claudeLines, manualLines, loading }) {
  if (loading) {
    return (
      <div className="bg-obs-surface border border-obs-border rounded-xl p-5">
        <div className="skeleton h-3 w-40 rounded mb-2" />
        <div className="skeleton h-3 w-28 rounded mb-6" />
        <div className="skeleton h-48 w-full rounded" />
      </div>
    )
  }

  // Build daily buckets
  const buckets = buildDailyLineBuckets(since, until)
  const bucketMap = Object.fromEntries(buckets.map(b => [b.dateISO, b]))

  taggedCommits.forEach(({ commit, isClaudeAssisted }) => {
    const dateStr = commit.created_at || commit.authored_date
    if (!dateStr) return
    const key = format(parseISO(dateStr), 'yyyy-MM-dd')
    if (!bucketMap[key]) return
    const add = commit.stats?.additions ?? 0
    const del = commit.stats?.deletions ?? 0
    if (isClaudeAssisted) {
      bucketMap[key].claudeAdd += add
      bucketMap[key].claudeDel += del
    } else {
      bucketMap[key].manualAdd += add
      bucketMap[key].manualDel += del
    }
  })

  const hasData = buckets.some(b => b.claudeAdd || b.claudeDel || b.manualAdd || b.manualDel)
  const hasStats = (claudeLines.additions + claudeLines.deletions + manualLines.additions + manualLines.deletions) > 0
  const tickInterval = buckets.length > 14 ? Math.ceil(buckets.length / 14) - 1 : 0

  const totalAI    = claudeLines.additions + claudeLines.deletions
  const totalAll   = totalAI + manualLines.additions + manualLines.deletions
  const aiLinesPct = totalAll > 0 ? Math.round((totalAI / totalAll) * 100) : 0

  return (
    <div className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up"
      style={{ animationDelay: '420ms', animationFillMode: 'both' }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-sans font-semibold text-obs-text-bright text-sm">Lines Changed via AI</h3>
          <p className="font-mono text-xs text-obs-text mt-0.5">Additions & deletions — AI vs manual</p>
        </div>

        {/* Summary pills */}
        {hasStats && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="flex items-center gap-1 bg-obs-cyan/10 border border-obs-cyan/20 rounded px-2 py-1 font-mono text-[10px] text-obs-cyan">
              <span className="text-green-400">+{claudeLines.additions.toLocaleString()}</span>
              <span className="text-obs-muted mx-0.5">/</span>
              <span className="text-red-400">−{claudeLines.deletions.toLocaleString()}</span>
              <span className="ml-1 text-obs-cyan">AI</span>
            </span>
            <span className="flex items-center gap-1 bg-obs-amber/10 border border-obs-amber/20 rounded px-2 py-1 font-mono text-[10px] text-obs-amber">
              <span className="text-green-400">+{manualLines.additions.toLocaleString()}</span>
              <span className="text-obs-muted mx-0.5">/</span>
              <span className="text-red-400">−{manualLines.deletions.toLocaleString()}</span>
              <span className="ml-1">manual</span>
            </span>
            <span className="bg-obs-border rounded px-2 py-1 font-mono text-[10px] text-obs-muted">
              {aiLinesPct}% AI
            </span>
          </div>
        )}
      </div>

      {!hasData || !hasStats ? (
        <div className="h-48 flex flex-col items-center justify-center gap-2">
          <p className="text-obs-muted text-sm font-mono">
            {!hasData ? 'No commits in this period' : 'Line stats unavailable'}
          </p>
          {!hasStats && hasData && (
            <p className="text-obs-muted text-xs font-mono opacity-60">
              GitLab may not support commit stats on this instance
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-mono mb-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-500/70 inline-block" />
              <span className="text-obs-text">AI +add</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500/50 inline-block" />
              <span className="text-obs-text">AI −del</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-obs-amber/60 inline-block" />
              <span className="text-obs-text">Manual +add</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-800/60 inline-block" />
              <span className="text-obs-text">Manual −del</span>
            </span>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={buckets} barSize={buckets.length > 20 ? 4 : 8} barGap={1}>
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
                width={36}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

              {/* Claude: additions (green) + deletions (red), stacked */}
              <Bar dataKey="claudeAdd" name="AI +add" stackId="claude" fill="rgba(34,197,94,0.7)"  radius={[0,0,0,0]} />
              <Bar dataKey="claudeDel" name="AI −del" stackId="claude" fill="rgba(239,68,68,0.5)"  radius={[3,3,0,0]} />

              {/* Manual: additions (amber) + deletions (dark orange), stacked */}
              <Bar dataKey="manualAdd" name="Manual +add" stackId="manual" fill="rgba(245,158,11,0.6)" radius={[0,0,0,0]} />
              <Bar dataKey="manualDel" name="Manual −del" stackId="manual" fill="rgba(180,83,9,0.6)"   radius={[3,3,0,0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
