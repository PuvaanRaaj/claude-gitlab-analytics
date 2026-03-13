import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { reviewDurationHours } from '../utils/dateHelpers'

const BUCKETS = [
  { key: 'lt1h',  label: '< 1h',   min: 0,    max: 0.99 },
  { key: '1_4h',  label: '1–4h',   min: 1,    max: 3.99 },
  { key: '4_24h', label: '4–24h',  min: 4,    max: 23.99 },
  { key: '1_7d',  label: '1–7d',   min: 24,   max: 167.99 },
  { key: 'gt7d',  label: '> 7d',   min: 168,  max: Infinity },
]

function getBucketLabel(hours) {
  for (const b of BUCKETS) {
    if (hours >= b.min && hours <= b.max) return b.label
  }
  return BUCKETS[BUCKETS.length - 1].label
}

function buildData(taggedMRs) {
  const counts = Object.fromEntries(BUCKETS.map(b => [b.label, { label: b.label, ai: 0, manual: 0 }]))
  for (const { mr, isClaudeAssisted } of taggedMRs) {
    if (mr.state !== 'merged') continue
    const hours = reviewDurationHours(mr)
    if (hours === null) continue
    const label = getBucketLabel(hours)
    if (isClaudeAssisted) counts[label].ai++
    else counts[label].manual++
  }
  return BUCKETS.map(b => counts[b.label])
}

function median(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function formatMedian(hours) {
  if (hours === null) return '—'
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${Math.round(hours)}h`
  return `${Math.round(hours / 24)}d`
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
          <span className="text-obs-muted">AI:</span>
          <span className="text-obs-text-bright font-semibold">{ai}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-obs-amber inline-block flex-shrink-0" />
          <span className="text-obs-muted">Manual:</span>
          <span className="text-obs-text-bright font-semibold">{manual}</span>
        </div>
      </div>
    </div>
  )
}

export default function TimeToMergeChart({ taggedMRs = [], loading }) {
  if (loading) {
    return (
      <div className="bg-obs-surface border border-obs-border rounded-xl p-5">
        <div className="skeleton h-3 w-32 rounded mb-4" />
        <div className="skeleton h-48 w-full rounded" />
      </div>
    )
  }

  const merged = taggedMRs.filter(t => t.mr.state === 'merged')
  const data = buildData(taggedMRs)

  const aiHours = merged
    .filter(t => t.isClaudeAssisted)
    .map(t => reviewDurationHours(t.mr))
    .filter(h => h !== null)

  const manualHours = merged
    .filter(t => !t.isClaudeAssisted)
    .map(t => reviewDurationHours(t.mr))
    .filter(h => h !== null)

  const medAI = formatMedian(median(aiHours))
  const medManual = formatMedian(median(manualHours))

  return (
    <div
      className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up"
      style={{ animationDelay: '300ms', animationFillMode: 'both' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-sans font-semibold text-obs-text-bright text-sm">Time to Merge</h3>
          <p className="font-mono text-xs text-obs-muted mt-0.5">Review duration distribution — AI vs manual</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono flex-shrink-0">
          <span className="flex items-center gap-1.5 bg-obs-cyan/10 border border-obs-cyan/20 rounded px-2 py-0.5">
            <span className="text-obs-cyan">AI median</span>
            <span className="text-obs-text-bright font-semibold">{medAI}</span>
          </span>
          <span className="flex items-center gap-1.5 bg-obs-amber/10 border border-obs-amber/20 rounded px-2 py-0.5">
            <span className="text-obs-amber">Manual median</span>
            <span className="text-obs-text-bright font-semibold">{medManual}</span>
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
            animationBegin={300}
          />
          <Bar
            dataKey="manual"
            name="Manual"
            fill="#F59E0B"
            radius={[3, 3, 0, 0]}
            isAnimationActive
            animationBegin={300}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
