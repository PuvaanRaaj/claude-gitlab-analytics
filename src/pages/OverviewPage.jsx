import MetricCard    from '../components/MetricCard'

function fmtLines(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}
import CommitChart   from '../components/CommitChart'
import ActivityDonut from '../components/ActivityDonut'

export default function OverviewPage({
  loading, since, until,
  totalMRs, totalIssues,
  claudeMRs: claudeMRsAll, myClaudeMRs, myMergedMRs,
  usageBreakdown, toolBreakdown,
  mergedMRs, closedIssues, avgReviewHours,
  myClaudeLines, myManualLines,
  myCommits, myTaggedCommits, myClaudeCommits, myClaudeCommitIds,
  currentUser,
}) {
  // Use personal MRs if available (after scope=all change), fall back to all
  const claudeMRs   = myClaudeMRs   ?? claudeMRsAll ?? []
  const myMerged    = myMergedMRs   ?? mergedMRs    ?? []
  const totalCommits  = myCommits?.length ?? 0
  const claudeCommits = myClaudeCommits ?? []
  const claudeCommitIds = myClaudeCommitIds ?? new Set()
  const aiPct   = totalCommits > 0 ? Math.round((claudeCommits.length / totalCommits) * 100) : 0
  const claudeLines = myClaudeLines ?? { additions: 0, deletions: 0 }
  const manualLines = myManualLines ?? { additions: 0, deletions: 0 }
  const aiLines = claudeLines.additions + claudeLines.deletions

  // Personal tool breakdown from my commits only
  const myToolBreakdown = (() => {
    const map = new Map()
    for (const { aiTool } of (myClaudeCommits ?? [])) {
      const tool = aiTool || 'Heuristic'
      map.set(tool, (map.get(tool) || 0) + 1)
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  })()

  const displayName = currentUser?.name || currentUser?.username || 'My'

  return (
    <div className="space-y-4">
      {/* Period indicator */}
      {!loading && (
        <div className="flex items-center gap-2 animate-fade-up" style={{ animationDelay: '50ms', animationFillMode: 'both' }}>
          <div className="status-dot" />
          <span className="font-mono text-xs text-obs-muted">
            {since?.slice(0, 10)} → {until?.slice(0, 10)} ·{' '}
            <span className="text-obs-cyan">{displayName}'s stats · {aiPct}% AI-assisted</span>
          </span>
        </div>
      )}

      {/* Metric Cards — all personal */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard label="My Commits"      value={loading ? null : totalCommits}    sub={`${claudeCommits.length} AI-assisted`}                   accent="cyan"   loading={loading} delay={0}   icon="⌥" />
        <MetricCard label="AI %"            value={loading ? null : `${aiPct}%`}     sub="of my commits"                                            accent="cyan"   loading={loading} delay={60}  icon="◈" />
        <MetricCard label="Merge Requests"  value={loading ? null : totalMRs}        sub={`${myMerged.length} merged`}                            accent="purple" loading={loading} delay={120} icon="⊕" />
        <MetricCard label="Issues resolved" value={loading ? null : closedIssues}    sub={`via AI MRs · ${totalIssues} total`}                     accent="green"  loading={loading} delay={180} icon="✓" />
        <MetricCard label="Avg review"      value={loading ? null : avgReviewHours > 0 ? `${avgReviewHours}h` : '—'} sub={`${myMerged.length} merged MRs`} accent="amber" loading={loading} delay={240} icon="⏱" />
        <MetricCard label="Lines via AI"    value={loading ? null : aiLines > 0 ? fmtLines(aiLines) : '—'}
          sub={aiLines > 0 ? `+${claudeLines.additions.toLocaleString()} / −${claudeLines.deletions.toLocaleString()}` : 'no stats'}
          accent="green" loading={loading} delay={300} icon="±" />
      </div>

      {/* Commit activity — my commits only */}
      <CommitChart commits={myCommits ?? []} claudeCommitIds={claudeCommitIds} since={since} until={until} loading={loading} />

      {/* Donut + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActivityDonut
          usageBreakdown={usageBreakdown}
          toolBreakdown={myToolBreakdown.length > 0 ? myToolBreakdown : toolBreakdown}
          claudeCount={claudeCommits.length}
          totalCount={totalCommits}
          loading={loading}
        />
        <div className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
          <h3 className="font-sans font-semibold text-obs-text-bright text-sm mb-4">My AI vs Manual Summary</h3>
          <div className="space-y-4">
            {[
              { label: 'My Commits',     ai: claudeCommits.length,  total: totalCommits,  color: '#00D4FF' },
              { label: 'Merge Requests', ai: claudeMRs.length,       total: totalMRs,      color: '#A78BFA' },
              { label: 'Lines changed',  ai: aiLines, total: aiLines + manualLines.additions + manualLines.deletions, color: '#22C55E' },
            ].map(({ label, ai, total, color }) => {
              const pct = total > 0 ? Math.round((ai / total) * 100) : 0
              return (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-mono text-xs text-obs-muted">{label}</span>
                    <span className="font-mono text-xs" style={{ color }}>{pct}% AI</span>
                  </div>
                  <div className="h-1.5 bg-obs-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="font-mono text-[10px] text-obs-muted">{ai.toLocaleString()} AI</span>
                    <span className="font-mono text-[10px] text-obs-muted">{total.toLocaleString()} total</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
