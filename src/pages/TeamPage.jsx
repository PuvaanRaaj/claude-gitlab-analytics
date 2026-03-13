import { useState } from 'react'
import TeamBreakdown    from '../components/TeamBreakdown'
import ProjectBreakdown from '../components/ProjectBreakdown'
import MetricCard       from '../components/MetricCard'
import FlowMetrics      from '../components/FlowMetrics'
import { useFlowAnalytics } from '../hooks/useFlowAnalytics'

function fmtLines(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function fmtDuration(ms) {
  if (ms <= 0 || isNaN(ms)) return '—'
  const totalMinutes = Math.floor(ms / 60000)
  const totalHours = Math.floor(totalMinutes / 60)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days > 0) return `${days}d ${hours}h`
  if (totalHours > 0) return `${totalHours}h`
  return `${totalMinutes}m`
}

function BurnRatePanel({ issues, loading }) {
  const opened = (issues || []).length
  const closed  = (issues || []).filter(i => i.state === 'closed').length
  const net     = closed - opened
  const total   = opened + closed
  const burnPct = opened > 0 ? Math.round((closed / opened) * 100) : 0
  const closedBarW = total > 0 ? (closed / total) * 100 : 0
  const openedBarW = total > 0 ? (opened / total) * 100 : 0

  return (
    <div className="bg-obs-surface border border-obs-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-obs-border">
        <h3 className="font-display font-semibold text-obs-text-bright text-sm">Issue Burn Rate</h3>
        <p className="font-mono text-xs text-obs-muted mt-0.5">Issues opened vs closed · in selected period</p>
      </div>
      <div className="p-5">
        {loading ? (
          <div className="space-y-2">
            <div className="skeleton h-8 w-full rounded" />
            <div className="skeleton h-4 w-2/3 rounded" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stat row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-obs-card border border-obs-border rounded-lg px-4 py-3 text-center">
                <div className="font-mono text-xl font-bold text-obs-amber">{opened.toLocaleString()}</div>
                <div className="font-mono text-[10px] text-obs-muted mt-0.5 uppercase tracking-widest">Opened</div>
              </div>
              <div className="bg-obs-card border border-obs-border rounded-lg px-4 py-3 text-center">
                <div className="font-mono text-xl font-bold text-green-400">{closed.toLocaleString()}</div>
                <div className="font-mono text-[10px] text-obs-muted mt-0.5 uppercase tracking-widest">Closed</div>
              </div>
              <div className="bg-obs-card border border-obs-border rounded-lg px-4 py-3 text-center">
                <div className={`font-mono text-xl font-bold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {net >= 0 ? '+' : ''}{net.toLocaleString()}
                </div>
                <div className="font-mono text-[10px] text-obs-muted mt-0.5 uppercase tracking-widest">Net</div>
              </div>
            </div>

            {/* Stacked bar chart */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] text-obs-muted">Closed vs Opened</span>
                <span className={`font-mono text-xs font-semibold ${burnPct >= 100 ? 'text-green-400' : burnPct >= 90 ? 'text-obs-amber' : 'text-red-400'}`}>
                  {burnPct}% burn rate{burnPct < 100 ? ' ↓ low' : ' ✓'}
                </span>
              </div>
              {/* Closed bar */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-14 text-right font-mono text-[10px] text-green-400 flex-shrink-0">Closed</div>
                  <div className="flex-1 h-5 bg-obs-card rounded overflow-hidden">
                    <div
                      className="h-full bg-green-500/70 rounded transition-all duration-700 flex items-center justify-end pr-2"
                      style={{ width: `${closedBarW}%` }}
                    >
                      {closedBarW > 15 && (
                        <span className="font-mono text-[10px] text-white/80">{closed}</span>
                      )}
                    </div>
                  </div>
                  {closedBarW <= 15 && <span className="font-mono text-[10px] text-green-400 w-8">{closed}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-14 text-right font-mono text-[10px] text-obs-amber flex-shrink-0">Opened</div>
                  <div className="flex-1 h-5 bg-obs-card rounded overflow-hidden">
                    <div
                      className="h-full bg-obs-amber/60 rounded transition-all duration-700 flex items-center justify-end pr-2"
                      style={{ width: `${openedBarW}%` }}
                    >
                      {openedBarW > 15 && (
                        <span className="font-mono text-[10px] text-white/80">{opened}</span>
                      )}
                    </div>
                  </div>
                  {openedBarW <= 15 && <span className="font-mono text-[10px] text-obs-amber w-8">{opened}</span>}
                </div>
              </div>
              {/* Status label */}
              <p className="font-mono text-[10px] text-obs-muted pt-1">
                {net >= 0
                  ? `Burning down ↓ — ${net} more closed than opened`
                  : `Accumulating ↑ — ${Math.abs(net)} more opened than closed`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TeamPage({ loading, taggedCommits, projects, claudeLines, manualLines, memberUsernameMap, mrs, issues, claudeMRs, claudeIssues, onSelectMember }) {
  const [flowEnabled, setFlowEnabled] = useState(false)
  const { mrFlows, issueFlows, loading: flowLoading, fetched } = useFlowAnalytics(mrs, issues, flowEnabled)
  const totalCommits = taggedCommits.length
  const aiCommits    = taggedCommits.filter(t => t.isClaudeAssisted).length
  const aiPct        = totalCommits > 0 ? Math.round((aiCommits / totalCommits) * 100) : 0

  const aiLines      = (claudeLines?.additions ?? 0) + (claudeLines?.deletions ?? 0)
  const manualLinesTotal = (manualLines?.additions ?? 0) + (manualLines?.deletions ?? 0)
  const totalLines   = aiLines + manualLinesTotal
  const linesPct     = totalLines > 0 ? Math.round((aiLines / totalLines) * 100) : 0

  // Avg merge time for AI MRs
  const mergedAIMRs = (claudeMRs || []).filter(t => t.mr.state === 'merged' && t.mr.merged_at && t.mr.created_at)
  const avgMergeMs = mergedAIMRs.length > 0
    ? mergedAIMRs.reduce((s, t) => s + (new Date(t.mr.merged_at) - new Date(t.mr.created_at)), 0) / mergedAIMRs.length
    : 0

  // Avg close time for AI issues
  const closedAIIssues = (claudeIssues || []).filter(t => t.issue.state === 'closed' && t.issue.closed_at && t.issue.created_at)
  const avgCloseMs = closedAIIssues.length > 0
    ? closedAIIssues.reduce((s, t) => s + (new Date(t.issue.closed_at) - new Date(t.issue.created_at)), 0) / closedAIIssues.length
    : 0

  return (
    <div className="space-y-4">
      {/* Team summary cards — 2 rows of 4 */}
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
        <MetricCard
          label="MRs Created by AI"
          value={loading ? null : (claudeMRs?.length ?? 0).toLocaleString()}
          sub={`${(claudeMRs || []).filter(t => t.mr.state === 'merged').length} merged`}
          accent="purple"
          loading={loading}
          delay={240}
          icon="⊕"
        />
        <MetricCard
          label="Issues Created With AI"
          value={loading ? null : (claudeIssues?.length ?? 0).toLocaleString()}
          sub={`${(claudeIssues || []).filter(t => t.issue.state === 'closed').length} closed`}
          accent="green"
          loading={loading}
          delay={300}
          icon="✓"
        />
        <MetricCard
          label="Avg Merge Time"
          value={loading ? null : mergedAIMRs.length > 0 ? fmtDuration(avgMergeMs) : '—'}
          sub="AI MRs merged"
          accent="amber"
          loading={loading}
          delay={360}
          icon="⏱"
        />
        <MetricCard
          label="Avg Close Time"
          value={loading ? null : closedAIIssues.length > 0 ? fmtDuration(avgCloseMs) : '—'}
          sub="AI issues closed"
          accent="amber"
          loading={loading}
          delay={420}
          icon="⏱"
        />
      </div>

      {/* Flow Analytics — right under the metric cards */}
      <div className="bg-obs-surface border border-obs-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-obs-border">
          <div>
            <h3 className="font-display font-semibold text-obs-text-bright text-sm">Pipeline Flow Analytics</h3>
            <p className="font-mono text-xs text-obs-muted mt-0.5">
              Time stuck at each stage · Coder → Review → QC → Deploy
            </p>
          </div>
          {!flowEnabled ? (
            <button
              onClick={() => setFlowEnabled(true)}
              className="px-4 py-1.5 rounded-lg border border-obs-cyan/30 font-mono text-xs text-obs-cyan hover:bg-obs-cyan/10 transition-all"
            >
              Load Flow Data
            </button>
          ) : flowLoading ? (
            <span className="font-mono text-xs text-obs-muted animate-pulse">Fetching label events…</span>
          ) : (
            <span className="font-mono text-xs text-obs-muted">
              {mrFlows.filter(f => f.isOpen).length} open · {mrFlows.filter(f => !f.isOpen).length} merged · {issueFlows.length} issues
            </span>
          )}
        </div>
        {flowEnabled && (
          <div className="p-5">
            <FlowMetrics
              mrFlows={mrFlows}
              issueFlows={issueFlows}
              loading={flowLoading}
              showTeamTable
            />
          </div>
        )}
      </div>

      <BurnRatePanel issues={issues} loading={loading} />

      <TeamBreakdown    taggedCommits={taggedCommits} mrs={mrs} issues={issues} loading={loading} memberUsernameMap={memberUsernameMap} onSelectMember={onSelectMember} />
      <ProjectBreakdown taggedCommits={taggedCommits} projects={projects} loading={loading} />
    </div>
  )
}
