import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0].payload
  return (
    <div className="bg-obs-surface border border-obs-border rounded-lg p-3 text-xs font-mono shadow-card">
      <p className="text-obs-text-bright font-semibold">{name}</p>
      <p className="text-obs-muted mt-0.5">{value} events</p>
    </div>
  )
}

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.08) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="rgba(255,255,255,0.9)" textAnchor="middle" dominantBaseline="central"
      fontSize={10} fontFamily="JetBrains Mono" fontWeight="500">
      {`${Math.round(percent * 100)}%`}
    </text>
  )
}

function DonutView({ data, centreValue, centreLabel }) {
  const hasData = data && data.length > 0
  if (!hasData) return (
    <div className="h-48 flex items-center justify-center">
      <p className="text-obs-muted text-sm font-mono">No AI activity detected</p>
    </div>
  )

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={72}
              paddingAngle={3}
              dataKey="value"
              labelLine={false}
              label={<CustomLabel />}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono font-semibold text-xl text-obs-cyan">{centreValue}</span>
          <span className="font-mono text-[10px] text-obs-muted">{centreLabel}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 min-w-0 flex-1">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <div className="min-w-0 flex-1">
              <span className="text-obs-text text-xs font-mono block truncate">{item.name}</span>
            </div>
            <span className="text-obs-muted text-xs font-mono flex-shrink-0">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ActivityDonut({ usageBreakdown, toolBreakdown, claudeCount, totalCount, loading }) {
  const [view, setView] = useState('tool') // 'tool' | 'type'

  if (loading) {
    return (
      <div className="bg-obs-surface border border-obs-border rounded-xl p-5">
        <div className="skeleton h-3 w-32 rounded mb-6" />
        <div className="skeleton h-48 w-full rounded-full" />
      </div>
    )
  }

  const aiPct = totalCount > 0 ? Math.round((claudeCount / totalCount) * 100) : 0

  return (
    <div className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up"
      style={{ animationDelay: '350ms', animationFillMode: 'both' }}>

      {/* Header + tab toggle */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-sans font-semibold text-obs-text-bright text-sm">AI Usage Breakdown</h3>
          <p className="font-mono text-xs text-obs-muted mt-0.5">
            {view === 'tool' ? 'Which tool assisted' : 'Activity by type'}
          </p>
        </div>

        <div className="flex items-center gap-0.5 bg-obs-card border border-obs-border rounded-lg p-0.5">
          {[
            { key: 'tool', label: 'By Tool' },
            { key: 'type', label: 'By Type' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`px-2.5 py-1 rounded-md font-mono text-[10px] transition-all ${
                view === tab.key
                  ? 'bg-obs-surface text-obs-cyan border border-obs-cyan/30'
                  : 'text-obs-muted hover:text-obs-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'tool' ? (
        <>
          {toolBreakdown?.length > 0 && toolBreakdown.some(t => t.name !== 'Heuristic') ? (
            <DonutView
              data={toolBreakdown}
              centreValue={`${aiPct}%`}
              centreLabel="AI total"
            />
          ) : (
            <div className="h-48 flex flex-col items-center justify-center gap-3 text-center px-4">
              <div className="w-10 h-10 rounded-full bg-obs-cyan/5 border border-obs-cyan/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    stroke="#00D4FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-obs-muted text-sm font-mono">No tool signals found</p>
              <p className="text-obs-muted text-xs font-mono opacity-60 leading-relaxed max-w-xs">
                Add <span className="text-obs-cyan">AI-Agent: cursor</span> or{' '}
                <span className="text-obs-cyan">AI-Agent: antigravity</span> trailers to your
                commit messages to see the breakdown here.
              </p>
            </div>
          )}
        </>
      ) : (
        <DonutView
          data={usageBreakdown}
          centreValue={`${aiPct}%`}
          centreLabel="AI total"
        />
      )}
    </div>
  )
}
