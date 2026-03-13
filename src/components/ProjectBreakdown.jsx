import { useState } from 'react'

function getProjectLabel(p) {
  // Build "Namespace / ProjectName" e.g. "Payment / Web"
  const parts = (p.path_with_namespace || '').split('/')
  if (parts.length >= 2) {
    const ns = parts[parts.length - 2].trim()
    const name = (p.name || parts[parts.length - 1]).trim()
    return `${ns} / ${name}`
  }
  return p.name || p.path_with_namespace || `Project ${p.id}`
}

function buildProjectData(taggedCommits, projects) {
  const projectNameMap = new Map()
  for (const p of projects) {
    projectNameMap.set(String(p.id), getProjectLabel(p))
  }

  const map = new Map()
  for (const { commit, isClaudeAssisted } of taggedCommits) {
    const pid = String(commit._projectId ?? '')
    if (!pid) continue
    const name = projectNameMap.get(pid) || `Project ${pid}`
    if (!map.has(pid)) map.set(pid, { pid, name, total: 0, ai: 0 })
    const entry = map.get(pid)
    entry.total++
    if (isClaudeAssisted) entry.ai++
  }

  return Array.from(map.values())
    .map(e => ({
      ...e,
      manual: e.total - e.ai,
      aiPct: e.total > 0 ? Math.round((e.ai / e.total) * 100) : 0,
    }))
    .sort((a, b) => b.ai - a.ai || b.aiPct - a.aiPct)
}

function HoverTooltip({ data, visible }) {
  if (!visible || !data) return null
  return (
    <div
      className="pointer-events-none absolute z-30 bg-obs-card border border-obs-border rounded-lg p-3 text-xs font-mono shadow-lg whitespace-nowrap"
      style={{ bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' }}
    >
      <p className="text-obs-text-bright font-semibold mb-2">{data.name}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-obs-text">Total</span>
        <span className="text-obs-text-bright text-right">{data.total.toLocaleString()}</span>
        <span className="text-obs-cyan">AI</span>
        <span className="text-obs-text-bright text-right">{data.ai.toLocaleString()}</span>
        <span className="text-obs-amber">Manual</span>
        <span className="text-obs-text-bright text-right">{data.manual.toLocaleString()}</span>
        <span className="text-obs-text border-t border-obs-border pt-1">AI %</span>
        <span className="text-obs-cyan font-semibold text-right border-t border-obs-border pt-1">{data.aiPct}%</span>
      </div>
    </div>
  )
}

function ProjectRow({ entry, maxTotal }) {
  const [hovered, setHovered] = useState(false)
  const barWidth = maxTotal > 0 ? (entry.total / maxTotal) * 100 : 0
  const aiWidth = entry.total > 0 ? (entry.ai / entry.total) * 100 : 0
  const manualWidth = 100 - aiWidth

  return (
    <div
      className="relative flex items-center gap-3 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Project name */}
      <div className="w-48 flex-shrink-0 text-right">
        <span
          className="font-mono text-xs text-obs-text-bright truncate block"
          title={entry.name}
        >
          {entry.name}
        </span>
      </div>

      {/* Bar track */}
      <div className="flex-1 relative h-5 bg-obs-border/40 rounded overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full flex rounded overflow-hidden transition-all duration-500"
          style={{ width: `${barWidth}%` }}
        >
          <div style={{ width: `${aiWidth}%`, background: '#00D4FF' }} />
          <div style={{ width: `${manualWidth}%`, background: '#F59E0B' }} />
        </div>
      </div>

      {/* Stats */}
      <div className="w-44 flex-shrink-0 text-right">
        <span className="font-mono text-xs text-obs-text whitespace-nowrap">
          {entry.total.toLocaleString()} commits · <span className="text-obs-cyan font-semibold">{entry.aiPct}% AI</span>
        </span>
      </div>

      {/* Tooltip */}
      <HoverTooltip data={entry} visible={hovered} />
    </div>
  )
}

export default function ProjectBreakdown({ taggedCommits = [], projects = [], loading }) {
  if (loading) {
    return (
      <div className="bg-obs-surface border border-obs-border rounded-xl p-5">
        <div className="skeleton h-3 w-32 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-5 w-full rounded" />
          ))}
        </div>
      </div>
    )
  }

  const data = buildProjectData(taggedCommits, projects)
  const maxTotal = data[0]?.total ?? 1

  if (!data.length) {
    return (
      <div
        className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up"
        style={{ animationDelay: '400ms', animationFillMode: 'both' }}
      >
        <h3 className="font-sans font-semibold text-obs-text-bright text-sm mb-1">Project AI Adoption</h3>
        <p className="font-mono text-xs text-obs-text mb-4">Commits per project — AI vs manual</p>
        <div className="h-32 flex items-center justify-center">
          <p className="text-obs-muted text-sm font-mono">No project data available</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up"
      style={{ animationDelay: '400ms', animationFillMode: 'both' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-sans font-semibold text-obs-text-bright text-sm">Project AI Adoption</h3>
          <p className="font-mono text-xs text-obs-text mt-0.5">Commits per project — AI vs manual</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
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

      <div className="space-y-2.5">
        {data.map(entry => (
          <ProjectRow key={entry.pid} entry={entry} maxTotal={maxTotal} />
        ))}
      </div>
    </div>
  )
}
