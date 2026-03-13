import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const BUCKETS = [
  { key: 'xs',  label: 'XS (<10)',    min: 0,   max: 9 },
  { key: 's',   label: 'S (10–50)',   min: 10,  max: 50 },
  { key: 'm',   label: 'M (50–200)',  min: 51,  max: 200 },
  { key: 'l',   label: 'L (200–500)', min: 201, max: 500 },
  { key: 'xl',  label: 'XL (500+)',   min: 501, max: Infinity },
]

function getMRSize(mr) {
  if (mr.changes_count != null && !isNaN(Number(mr.changes_count))) {
    return Number(mr.changes_count)
  }
  return Math.round((mr.description || '').length / 10)
}

function bucketLabel(size) {
  for (const b of BUCKETS) {
    if (size >= b.min && size <= b.max) return b.label
  }
  return BUCKETS[BUCKETS.length - 1].label
}

function buildData(taggedMRs) {
  const counts = Object.fromEntries(BUCKETS.map(b => [b.label, { label: b.label, ai: 0, manual: 0 }]))
  for (const { mr, isClaudeAssisted } of taggedMRs) {
    const size = getMRSize(mr)
    const label = bucketLabel(size)
    if (isClaudeAssisted) counts[label].ai++
    else counts[label].manual++
  }
  return BUCKETS.map(b => counts[b.label])
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const ai = payload.find(p => p.dataKey === 'ai')?.value ?? 0
  const manual = payload.find(p => p.dataKey === 'manual')?.value ?? 0
  return (
    <div className="bg-obs-surface border border-obs-border rounded-lg p-3 text-xs font-mono shadow-lg">
      <p className="text-obs-muted mb-2 font-semibold">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-obs-cyan inline-block flex-shrink-0" />
          <span className="text-obs-text">AI:</span>
          <span className="text-obs-text-bright font-semibold">{ai}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-obs-amber inline-block flex-shrink-0" />
          <span className="text-obs-text">Manual:</span>
          <span className="text-obs-text-bright font-semibold">{manual}</span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-obs-border">
          <span className="text-obs-text">Total:</span>
          <span className="text-obs-text-bright font-semibold">{ai + manual}</span>
        </div>
      </div>
    </div>
  )
}

export default function MRSizeChart({ taggedMRs = [], loading }) {
  if (loading) {
    return (
      <div className="bg-obs-surface border border-obs-border rounded-xl p-5">
        <div className="skeleton h-3 w-32 rounded mb-4" />
        <div className="skeleton h-48 w-full rounded" />
      </div>
    )
  }

  const data = buildData(taggedMRs)
  const totalAI = taggedMRs.filter(t => t.isClaudeAssisted).length
  const totalManual = taggedMRs.length - totalAI

  return (
    <div
      className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up"
      style={{ animationDelay: '250ms', animationFillMode: 'both' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-sans font-semibold text-obs-text-bright text-sm">MR Size Distribution</h3>
          <p className="font-mono text-xs text-obs-text mt-0.5">File changes per MR — AI vs manual</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-obs-cyan inline-block" />
            <span className="text-obs-text">AI</span>
            <span className="text-obs-text-bright font-semibold">{totalAI}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-obs-amber inline-block" />
            <span className="text-obs-text">Manual</span>
            <span className="text-obs-text-bright font-semibold">{totalManual}</span>
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barSize={16} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(26,32,53,0.8)" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#4B5680', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#4B5680', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar
            dataKey="ai"
            name="AI"
            fill="#00D4FF"
            radius={[3, 3, 0, 0]}
            isAnimationActive
            animationBegin={250}
          />
          <Bar
            dataKey="manual"
            name="Manual"
            fill="#F59E0B"
            radius={[3, 3, 0, 0]}
            isAnimationActive
            animationBegin={250}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
