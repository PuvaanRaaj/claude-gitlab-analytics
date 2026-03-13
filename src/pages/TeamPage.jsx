import TeamBreakdown    from '../components/TeamBreakdown'

function fmtLines(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}
import ProjectBreakdown from '../components/ProjectBreakdown'
import MetricCard       from '../components/MetricCard'

export default function TeamPage({ loading, taggedCommits, projects, claudeLines, manualLines, memberUsernameMap, mrs, issues }) {
  const totalCommits = taggedCommits.length
  const aiCommits    = taggedCommits.filter(t => t.isClaudeAssisted).length
  const aiPct        = totalCommits > 0 ? Math.round((aiCommits / totalCommits) * 100) : 0

  const aiLines      = (claudeLines?.additions ?? 0) + (claudeLines?.deletions ?? 0)
  const manualLinesTotal = (manualLines?.additions ?? 0) + (manualLines?.deletions ?? 0)
  const totalLines   = aiLines + manualLinesTotal
  const linesPct     = totalLines > 0 ? Math.round((aiLines / totalLines) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Team summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Team Commits"
          value={loading ? null : totalCommits.toLocaleString()}
          sub={`${aiCommits.toLocaleString()} AI-assisted`}
          accent="cyan"
          loading={loading}
          delay={0}
          icon="⌥"
        />
        <MetricCard
          label="Team AI %"
          value={loading ? null : `${aiPct}%`}
          sub="of all team commits"
          accent="cyan"
          loading={loading}
          delay={60}
          icon="◈"
        />
        <MetricCard
          label="Team Lines via AI"
          value={loading ? null : aiLines > 0 ? fmtLines(aiLines) : '—'}
          sub={aiLines > 0 ? `+${(claudeLines?.additions ?? 0).toLocaleString()} / −${(claudeLines?.deletions ?? 0).toLocaleString()}` : 'no stats'}
          accent="green"
          loading={loading}
          delay={120}
          icon="±"
        />
        <MetricCard
          label="Lines AI %"
          value={loading ? null : `${linesPct}%`}
          sub={`${fmtLines(totalLines)} total lines`}
          accent="green"
          loading={loading}
          delay={180}
          icon="◈"
        />
      </div>

      <TeamBreakdown    taggedCommits={taggedCommits} mrs={mrs} issues={issues} loading={loading} memberUsernameMap={memberUsernameMap} />
      <ProjectBreakdown taggedCommits={taggedCommits} projects={projects} loading={loading} />
    </div>
  )
}
