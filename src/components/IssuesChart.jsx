import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AI_LABEL_PATTERNS } from '../utils/detection'

function isAILabel(label) {
  const name = typeof label === 'string' ? label : label?.name || ''
  return AI_LABEL_PATTERNS.some(re => re.test(name))
}

function labelName(label) {
  return typeof label === 'string' ? label : label?.name || ''
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-obs-surface border border-obs-border rounded-lg p-3 text-xs font-mono shadow-card">
      <p className="text-obs-cyan font-semibold mb-2">{label}</p>
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

export default function IssuesChart({ issues, loading }) {
  if (loading) {
    return (
      <div className="bg-obs-surface border border-obs-border rounded-xl p-5">
        <div className="skeleton h-3 w-32 rounded mb-6" />
        <div className="skeleton h-48 w-full rounded" />
      </div>
    )
  }

  // Only aggregate issues that have at least one AI label
  const labelMap = {}
  issues.forEach(issue => {
    const aiLabels = (issue.labels || []).filter(isAILabel)
    if (aiLabels.length === 0) return
    aiLabels.forEach(label => {
      const name = labelName(label)
      if (!labelMap[name]) labelMap[name] = { label: name, opened: 0, closed: 0 }
      labelMap[name].opened++
      if (issue.state === 'closed') labelMap[name].closed++
    })
  })

  const data = Object.values(labelMap).sort((a, b) => b.opened - a.opened)
  const hasData = data.length > 0
  const aiLabelExamples = 'ai-assisted · claude · claude-code · llm-assisted'

  return (
    <div className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up"
      style={{ animationDelay: '450ms', animationFillMode: 'both' }}>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-sans font-semibold text-obs-text-bright text-sm">Issues by AI Label</h3>
          <p className="font-mono text-xs text-obs-muted mt-0.5">Opened vs closed — AI-tagged only</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-obs-cyan inline-block" />
            <span className="text-obs-muted">Opened</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />
            <span className="text-obs-muted">Closed</span>
          </span>
        </div>
      </div>

      {!hasData ? (
        <div className="h-48 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <div className="w-10 h-10 rounded-full bg-obs-cyan/5 border border-obs-cyan/20 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="#00D4FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-obs-muted text-sm font-mono">No AI labels found on issues</p>
          <p className="text-obs-muted text-xs font-mono opacity-60 leading-relaxed max-w-xs">
            Add labels like <span className="text-obs-cyan">{aiLabelExamples}</span> to your GitLab issues to track them here.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 48)}>
          <BarChart data={data} layout="vertical" barSize={12} barGap={3}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(26,32,53,0.8)" />
            <XAxis
              type="number"
              tick={{ fill: '#4B5680', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              dataKey="label"
              type="category"
              tick={{ fill: '#00D4FF', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar dataKey="opened" name="Opened" fill="#00D4FF" fillOpacity={0.7} radius={[0, 4, 4, 0]} />
            <Bar dataKey="closed" name="Closed" fill="#22C55E" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
