import { useState } from 'react'
import { parseAILabels } from '../utils/detection'
import FlowMetrics from '../components/FlowMetrics'
import { useFlowAnalytics } from '../hooks/useFlowAnalytics'

const DEFINITIVE_REASONS = ['ai_agent_trailer', 'co_author_trailer', 'risk_level_trailer', 'antigravity_pattern', 'cursor_style', 'detailed_conventional_commit', 'conventional_commit', 'descriptive_action_commit']
const PAGE_SIZE = 25

function normStr(s) {
  return (s || '').replace(/[\s._-]+/g, '').toLowerCase()
}

function fmtDuration(ms) {
  if (ms <= 0 || isNaN(ms)) return '—'
  const totalMinutes = Math.floor(ms / 60000)
  const totalHours = Math.floor(totalMinutes / 60)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}d ${hours}h`
  if (totalHours > 0) return `${totalHours}h ${minutes}m`
  return `${minutes}m`
}

function commitSignalBadge(isClaudeAssisted, reasons = [], aiTool) {
  if (!isClaudeAssisted) {
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-obs-amber/10 text-obs-amber border border-obs-amber/20">manual</span>
  }
  const isDefinitive = reasons.some(r => DEFINITIVE_REASONS.includes(r))
  if (isDefinitive) {
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-obs-cyan/10 text-obs-cyan border border-obs-cyan/20">
        ai·{aiTool ? aiTool.toLowerCase() : 'tool'}
      </span>
    )
  }
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-400/10 text-purple-400 border border-purple-400/20">
      ~ai
    </span>
  )
}

function StatCard({ label, value, sub, accent = 'cyan' }) {
  const accentColors = {
    cyan:   { color: '#00C9FF', text: 'text-[#00C9FF]' },
    amber:  { color: '#F4A024', text: 'text-[#F4A024]' },
    green:  { color: '#22C55E', text: 'text-green-400' },
    purple: { color: '#A78BFA', text: 'text-[#A78BFA]' },
  }
  const a = accentColors[accent] || accentColors.cyan
  return (
    <div className="relative bg-obs-surface border border-obs-border rounded-xl p-4 overflow-hidden card-hover">
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl" style={{ background: `linear-gradient(90deg, transparent, ${a.color}40, transparent)` }} />
      <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full" style={{ background: a.color, opacity: 0.5 }} />
      <div className="pl-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-obs-muted mb-2">{label}</p>
        <p className={`font-display font-semibold text-2xl leading-none ${a.text}`}>{value ?? '—'}</p>
        {sub && <p className="font-mono text-[10px] text-obs-muted mt-1.5">{sub}</p>}
      </div>
    </div>
  )
}

function hasAIMRLabel(mr) {
  return (mr.labels || []).some(l => {
    const n = typeof l === 'string' ? l : l?.name || ''
    return /^(ai::|code::|ai-trust::)/i.test(n)
  })
}

function hasAIIssueLabel(issue) {
  return (issue.labels || []).some(l => {
    const n = typeof l === 'string' ? l : l?.name || ''
    return /^(ai::|code::|ai-trust::)/i.test(n)
  })
}

export default function MemberPage({ author, taggedCommits, mrs = [], issues = [], onBack }) {
  const [tab, setTab] = useState('commits')
  const [page, setPage] = useState(0)
  const [commitFilter, setCommitFilter] = useState('all')
  const [mrFilter,     setMrFilter]     = useState('all')
  const [issueFilter,  setIssueFilter]  = useState('all')
  const [flowEnabled,  setFlowEnabled]  = useState(false)

  // Build set of all normalised names this author is known by
  const authorNameKeys = new Set([
    author.key,
    ...(author.aliases ? author.aliases.split(' · ').map(normStr) : []),
    ...(author.displayName ? [normStr(author.displayName)] : []),
  ])

  // Filter commits
  const commits = taggedCommits.filter(t => authorNameKeys.has(normStr(t.commit.author_name || '')))

  // Filter MRs
  function mrBelongsToAuthor(mr) {
    if (author.username) {
      return mr.author?.username === author.username
    }
    return authorNameKeys.has(normStr(mr.author?.name || ''))
  }
  const memberMRs = mrs.filter(mrBelongsToAuthor)

  // Filter issues
  function issueBelongsToAuthor(issue) {
    if (author.username) {
      return issue.author?.username === author.username
    }
    return authorNameKeys.has(normStr(issue.author?.name || ''))
  }
  const memberIssues = issues.filter(issueBelongsToAuthor)

  // Compute stats
  const aiCommits = commits.filter(t => t.isClaudeAssisted).length

  const mergedMRs = memberMRs.filter(mr => mr.state === 'merged' && mr.merged_at && mr.created_at)
  const avgMergeMs = mergedMRs.length > 0
    ? mergedMRs.reduce((s, mr) => s + (new Date(mr.merged_at) - new Date(mr.created_at)), 0) / mergedMRs.length
    : 0

  const closedIssues = memberIssues.filter(i => i.state === 'closed' && i.closed_at && i.created_at)
  const avgCloseMs = closedIssues.length > 0
    ? closedIssues.reduce((s, i) => s + (new Date(i.closed_at) - new Date(i.created_at)), 0) / closedIssues.length
    : 0

  // Burn rate: AI commits per week over the period
  const commitDates = commits.map(t => new Date(t.commit.authored_date || t.commit.created_at)).filter(Boolean)
  const periodMs = commitDates.length >= 2
    ? Math.max(...commitDates) - Math.min(...commitDates)
    : 7 * 24 * 60 * 60 * 1000
  const weeks = Math.max(periodMs / (7 * 24 * 60 * 60 * 1000), 1)
  const aiCommitsWeek = (aiCommits / weeks).toFixed(1)
  const totalCommitsWeek = (commits.length / weeks).toFixed(1)

  const TABS = [
    { id: 'commits', label: `Commits (${commits.length})` },
    { id: 'mrs',     label: `MRs (${memberMRs.length})` },
    { id: 'issues',  label: `Issues (${memberIssues.length})` },
  ]

  function switchTab(t) { setTab(t); setPage(0); setMrFilter('all'); setIssueFilter('all') }

  const sortedMRs = [...memberMRs].sort((a, b) => {
    // Open MRs first
    if (a.state === 'opened' && b.state !== 'opened') return -1
    if (b.state === 'opened' && a.state !== 'opened') return 1
    // Open MRs: oldest first (highest age = most urgent)
    if (a.state === 'opened' && b.state === 'opened') {
      return new Date(a.created_at) - new Date(b.created_at)
    }
    // Others: newest first
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const sortedIssues = [...memberIssues].sort((a, b) => {
    if (a.state === 'opened' && b.state !== 'opened') return -1
    if (b.state === 'opened' && a.state !== 'opened') return 1
    return new Date(b.created_at) - new Date(a.created_at)
  })

  // Filtered commits for commit filter toggle
  const filteredCommits = commitFilter === 'all'
    ? commits
    : commitFilter === 'ai'
      ? commits.filter(t => t.isClaudeAssisted)
      : commits.filter(t => !t.isClaudeAssisted)

  // MR section split
  const aiMRsList     = sortedMRs.filter(hasAIMRLabel)
  const manualMRsList = sortedMRs.filter(mr => !hasAIMRLabel(mr))

  // Issue section split
  const aiIssuesList     = sortedIssues.filter(hasAIIssueLabel)
  const manualIssuesList = sortedIssues.filter(i => !hasAIIssueLabel(i))

  // Apply MR/Issue filters
  const filteredMRs = mrFilter === 'all' ? sortedMRs : mrFilter === 'ai' ? aiMRsList : manualMRsList
  const filteredIssues = issueFilter === 'all' ? sortedIssues : issueFilter === 'ai' ? aiIssuesList : manualIssuesList

  const activeItems = tab === 'commits' ? filteredCommits : tab === 'mrs' ? filteredMRs : filteredIssues
  const totalPages = Math.ceil(activeItems.length / PAGE_SIZE)

  // Flow analytics (lazy)
  const { mrFlows, issueFlows, loading: flowLoading } = useFlowAnalytics(memberMRs, memberIssues, flowEnabled)

  function renderCommitRow(commit, isClaudeAssisted, reasons = [], aiTool) {
    const firstLine = (commit.message || '').split('\n')[0].trim()
    const date = commit.authored_date || commit.created_at
    return (
      <div key={commit.id || commit.short_id} className="px-5 py-3 hover:bg-obs-card/40 transition-colors">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 pt-0.5">
            {commitSignalBadge(isClaudeAssisted, reasons, aiTool)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-obs-text-bright leading-snug truncate" title={firstLine}>
              {firstLine}
            </p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {commit.web_url
                ? <a href={commit.web_url} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-obs-cyan hover:underline">{commit.short_id}</a>
                : <span className="font-mono text-[10px] text-obs-muted">{commit.short_id}</span>}
              {date && <span className="font-mono text-[10px] text-obs-muted">{new Date(date).toLocaleDateString()}</span>}
              {commit.stats?.total > 0 && (
                <span className="font-mono text-[10px] text-obs-muted">
                  +{commit.stats.additions ?? 0} −{commit.stats.deletions ?? 0}
                </span>
              )}
              {reasons?.length > 0 && (
                <span className="font-mono text-[10px] text-obs-muted/60">{reasons.slice(0, 2).join(', ')}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderMRRow(mr) {
    const { tool, role, confidence } = parseAILabels(mr.labels || [])
    const allAILabels = [...tool, ...role, ...confidence]
    const mergeMs = mr.state === 'merged' && mr.merged_at && mr.created_at
      ? new Date(mr.merged_at) - new Date(mr.created_at)
      : null
    const openAgeMs = mr.state === 'opened' && mr.created_at
      ? Date.now() - new Date(mr.created_at)
      : null
    const ageDays = openAgeMs ? openAgeMs / (1000 * 60 * 60 * 24) : 0

    const stateCls = mr.state === 'merged'
      ? 'status-merged'
      : mr.state === 'opened'
        ? 'status-open'
        : 'status-closed'

    return (
      <div key={mr.id} className="px-5 py-3.5 hover:bg-obs-card/40 transition-colors">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] uppercase tracking-wide flex-shrink-0 ${stateCls}`}>
                {mr.state}
              </span>
              <span className="font-mono text-xs text-obs-muted">!{mr.iid}</span>
              {mr.author?.username && (
                <span className="font-mono text-xs text-obs-muted">@{mr.author.username}</span>
              )}
              {openAgeMs !== null && (
                <span className={`font-mono text-[10px] font-semibold ${
                  ageDays > 7 ? 'text-red-400' : ageDays > 3 ? 'text-obs-amber' : 'text-obs-muted'
                }`}>
                  {ageDays > 7 ? '!! ' : ageDays > 3 ? '⚠ ' : ''}open {fmtDuration(openAgeMs)}
                </span>
              )}
            </div>
            {mr.web_url
              ? <a href={mr.web_url} target="_blank" rel="noopener noreferrer" className="font-sans text-sm text-obs-text-bright hover:text-obs-cyan transition-colors line-clamp-1">{mr.title}</a>
              : <p className="font-sans text-sm text-obs-text-bright line-clamp-1">{mr.title}</p>}
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              {mergeMs !== null && (
                <span className="font-mono text-[10px] text-obs-muted">merged in {fmtDuration(mergeMs)}</span>
              )}
              {mr.target_branch && (
                <span className="font-mono text-[10px] text-obs-muted">→ {mr.target_branch}</span>
              )}
              {mr.assignees?.[0] && (
                <span className="font-mono text-[10px] text-obs-muted">→ @{mr.assignees[0].username}</span>
              )}
              {mr.user_notes_count > 0 && (
                <span className="font-mono text-[10px] text-obs-muted">[{mr.user_notes_count} comments]</span>
              )}
              {allAILabels.map(l => (
                <span key={l} className="px-1.5 py-0.5 rounded border border-obs-cyan/20 font-mono text-[10px] bg-obs-cyan/10 text-obs-cyan">
                  {l.replace(/^(code|ai|ai-trust|review)::/i, '')}
                </span>
              ))}
            </div>
          </div>
          <span className="font-mono text-xs text-obs-muted flex-shrink-0 text-right">
            {mr.created_at ? new Date(mr.created_at).toLocaleDateString() : ''}
          </span>
        </div>
      </div>
    )
  }

  function renderIssueRow(issue) {
    const { tool, role } = parseAILabels(issue.labels || [])
    const allAILabels = [...tool, ...role]
    const closeMs = issue.state === 'closed' && issue.closed_at && issue.created_at
      ? new Date(issue.closed_at) - new Date(issue.created_at)
      : null
    const labelCount = (issue.labels || []).length
    return (
      <div key={issue.id} className="px-5 py-3.5 hover:bg-obs-card/40 transition-colors">
        <div className="flex items-start gap-3">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${issue.state === 'closed' ? 'bg-green-500' : 'bg-obs-amber'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-xs text-obs-muted">#{issue.iid}</span>
              {issue.assignees?.[0] && (
                <span className="font-mono text-[10px] text-obs-muted">→ @{issue.assignees[0].username}</span>
              )}
              {labelCount > 0 && (
                <span className="font-mono text-[10px] text-obs-muted/60">{labelCount} label{labelCount !== 1 ? 's' : ''}</span>
              )}
            </div>
            {issue.web_url
              ? <a href={issue.web_url} target="_blank" rel="noopener noreferrer" className="font-sans text-sm text-obs-text-bright hover:text-obs-cyan transition-colors line-clamp-1">{issue.title}</a>
              : <p className="font-sans text-sm text-obs-text-bright line-clamp-1">{issue.title}</p>}
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              {closeMs !== null && (
                <span className="font-mono text-[10px] text-obs-muted">closed in {fmtDuration(closeMs)}</span>
              )}
              {allAILabels.map(l => (
                <span key={l} className="px-1.5 py-0.5 rounded border border-obs-cyan/20 font-mono text-[10px] bg-obs-cyan/10 text-obs-cyan">
                  {l.replace(/^(code|ai|ai-trust|review)::/i, '')}
                </span>
              ))}
            </div>
          </div>
          <span className="font-mono text-xs text-obs-muted flex-shrink-0 text-right">
            {issue.created_at ? new Date(issue.created_at).toLocaleDateString() : ''}
          </span>
        </div>
      </div>
    )
  }

  const aiPct = commits.length > 0 ? Math.round((aiCommits / commits.length) * 100) : 0

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 font-mono text-sm text-obs-muted hover:text-obs-cyan transition-colors"
      >
        ← Team
      </button>

      {/* Header card - premium gradient */}
      <div className="relative bg-obs-surface border border-obs-border rounded-2xl p-6 overflow-hidden card-hover">
        <div className="absolute inset-0 opacity-30" style={{background: 'radial-gradient(ellipse at top left, rgba(0,201,255,0.08) 0%, transparent 60%)'}} />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                {/* Avatar circle with initials */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-display font-bold text-obs-bg flex-shrink-0" style={{background: 'linear-gradient(135deg, #00C9FF, #0066FF)'}}>
                  {(author.author.replace('@','') || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="font-display font-bold text-obs-text-bright text-xl leading-none">{author.author}</h2>
                  {author.displayName && <p className="font-mono text-xs text-obs-muted mt-0.5">{author.displayName}</p>}
                </div>
              </div>
              {author.aliases && <p className="font-mono text-[10px] text-obs-muted/50 mt-1 ml-13">aka {author.aliases}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="px-2.5 py-1 rounded-full text-[10px] font-mono ai-badge-glow">
                {aiPct}% AI
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total Commits" value={commits.length.toLocaleString()} accent="cyan" />
        <StatCard label="AI Commits" value={aiCommits.toLocaleString()} accent="purple" />
        <StatCard label="Avg Time to Merge" value={mergedMRs.length > 0 ? fmtDuration(avgMergeMs) : '—'} accent="amber" />
        <StatCard label="Avg Time to Close" value={closedIssues.length > 0 ? fmtDuration(avgCloseMs) : '—'} accent="green" />
        <StatCard label="Burn Rate (AI/wk)" value={`${aiCommitsWeek}`} sub={`${totalCommitsWeek} total/wk`} accent="cyan" />
      </div>

      {/* Flow Analytics */}
      <div className="bg-obs-surface border border-obs-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-obs-border">
          <div>
            <h4 className="font-display font-semibold text-obs-text-bright text-sm">Pipeline Flow Timing</h4>
            <p className="font-mono text-[10px] text-obs-muted mt-0.5">Time spent at each stage based on DO:: labels</p>
          </div>
          {!flowEnabled ? (
            <button
              onClick={() => setFlowEnabled(true)}
              className="px-3 py-1.5 rounded-lg border border-obs-cyan/30 font-mono text-[10px] text-obs-cyan hover:bg-obs-cyan/10 transition-all"
            >
              Load
            </button>
          ) : flowLoading ? (
            <span className="font-mono text-[10px] text-obs-muted animate-pulse">Loading…</span>
          ) : null}
        </div>
        {flowEnabled && (
          <div className="p-4">
            <FlowMetrics
              mrFlows={mrFlows}
              issueFlows={issueFlows}
              loading={flowLoading}
              memberUsername={author.username || author.key}
            />
          </div>
        )}
      </div>

      <div className="section-divider" />

      {/* Tabs + content */}
      <div className="bg-obs-surface border border-obs-border rounded-xl overflow-hidden">
        {/* Underline-style tab bar */}
        <div className="flex items-center border-b border-obs-border bg-obs-card/20 rounded-t-xl px-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`relative px-4 py-3 font-mono text-xs transition-all ${
                tab === t.id ? 'text-obs-cyan' : 'text-obs-muted hover:text-obs-text'
              }`}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-obs-cyan" />
              )}
            </button>
          ))}
        </div>

        {/* Commits filter bar */}
        {tab === 'commits' && (
          <div className="px-5 py-2.5 border-b border-obs-border/40 bg-obs-card/20 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {['all', 'ai', 'manual'].map(f => (
                <button
                  key={f}
                  onClick={() => { setCommitFilter(f); setPage(0) }}
                  className={`px-3 py-1 rounded-md font-mono text-[10px] uppercase tracking-wider transition-all ${
                    commitFilter === f
                      ? 'bg-obs-surface text-obs-cyan border border-obs-cyan/30'
                      : 'text-obs-muted hover:text-obs-text'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <span className="font-mono text-[10px] text-obs-muted">
              {filteredCommits.length} commits
            </span>
          </div>
        )}

        {/* MRs filter bar */}
        {tab === 'mrs' && (
          <div className="px-5 py-2.5 border-b border-obs-border/40 bg-obs-card/20 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {['all', 'ai', 'manual'].map(f => (
                <button
                  key={f}
                  onClick={() => { setMrFilter(f); setPage(0) }}
                  className={`px-3 py-1 rounded-md font-mono text-[10px] uppercase tracking-wider transition-all ${
                    mrFilter === f
                      ? 'bg-obs-surface text-obs-cyan border border-obs-cyan/30'
                      : 'text-obs-muted hover:text-obs-text'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-400">
                {memberMRs.filter(mr => mr.state === 'opened').length} open
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-obs-cyan/30 bg-obs-cyan/10 text-obs-cyan">
                {memberMRs.filter(mr => mr.state === 'merged').length} merged
              </span>
              <span className="font-mono text-[10px] text-obs-muted/50">{filteredMRs.length} shown</span>
            </div>
          </div>
        )}

        {/* Issues filter bar */}
        {tab === 'issues' && (
          <div className="px-5 py-2.5 border-b border-obs-border/40 bg-obs-card/20 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {['all', 'ai', 'manual'].map(f => (
                <button
                  key={f}
                  onClick={() => { setIssueFilter(f); setPage(0) }}
                  className={`px-3 py-1 rounded-md font-mono text-[10px] uppercase tracking-wider transition-all ${
                    issueFilter === f
                      ? 'bg-obs-surface text-obs-cyan border border-obs-cyan/30'
                      : 'text-obs-muted hover:text-obs-text'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-obs-amber/30 bg-obs-amber/10 text-obs-amber">
                {memberIssues.filter(i => i.state === 'opened').length} open
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-green-500/30 bg-green-500/10 text-green-400">
                {memberIssues.filter(i => i.state === 'closed').length} closed
              </span>
              <span className="font-mono text-[10px] text-obs-muted/50">{filteredIssues.length} shown</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div>
          {/* ── COMMITS TAB ── */}
          {tab === 'commits' && (
            filteredCommits.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-obs-muted text-sm font-mono">No commits</p>
              </div>
            ) : commitFilter === 'all' ? (
              /* Grouped: AI section then Manual section */
              <>
                {filteredCommits.filter(t => t.isClaudeAssisted).length > 0 && (
                  <div>
                    <div className="px-5 py-2.5 flex items-center gap-3 bg-obs-card/30 border-b border-obs-border/40">
                      <div className="w-1.5 h-1.5 rounded-full bg-obs-cyan" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-obs-cyan">
                        AI Commits ({filteredCommits.filter(t => t.isClaudeAssisted).length})
                      </span>
                    </div>
                    <div className="divide-y divide-obs-border/50">
                      {filteredCommits.filter(t => t.isClaudeAssisted).slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(({ commit, isClaudeAssisted, reasons = [], aiTool }) => renderCommitRow(commit, isClaudeAssisted, reasons, aiTool))}
                    </div>
                  </div>
                )}
                {filteredCommits.filter(t => !t.isClaudeAssisted).length > 0 && (
                  <div>
                    {filteredCommits.filter(t => t.isClaudeAssisted).length > 0 && <div className="section-divider" />}
                    <div className="px-5 py-2.5 flex items-center gap-3 bg-obs-card/30 border-b border-obs-border/40">
                      <div className="w-1.5 h-1.5 rounded-full bg-obs-amber" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-obs-amber">
                        Manual Commits ({filteredCommits.filter(t => !t.isClaudeAssisted).length})
                      </span>
                    </div>
                    <div className="divide-y divide-obs-border/50">
                      {filteredCommits.filter(t => !t.isClaudeAssisted).slice(0, PAGE_SIZE).map(({ commit, isClaudeAssisted, reasons = [], aiTool }) => renderCommitRow(commit, isClaudeAssisted, reasons, aiTool))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="divide-y divide-obs-border/50">
                {filteredCommits.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(({ commit, isClaudeAssisted, reasons = [], aiTool }) => renderCommitRow(commit, isClaudeAssisted, reasons, aiTool))}
              </div>
            )
          )}

          {/* ── MRs TAB ── */}
          {tab === 'mrs' && (
            filteredMRs.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-obs-muted text-sm font-mono">No MRs</p>
              </div>
            ) : mrFilter === 'all' ? (
              <>
                {aiMRsList.length > 0 && (
                  <div>
                    <div className="px-5 py-2.5 flex items-center gap-3 bg-obs-card/30 border-b border-obs-border/40">
                      <div className="w-1.5 h-1.5 rounded-full bg-obs-cyan" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-obs-cyan">MRs Created by AI ({aiMRsList.length})</span>
                    </div>
                    <div className="divide-y divide-obs-border/50">
                      {aiMRsList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(mr => renderMRRow(mr))}
                    </div>
                  </div>
                )}
                {manualMRsList.length > 0 && (
                  <div>
                    {aiMRsList.length > 0 && <div className="section-divider" />}
                    <div className="px-5 py-2.5 flex items-center gap-3 bg-obs-card/30 border-b border-obs-border/40">
                      <div className="w-1.5 h-1.5 rounded-full bg-obs-amber" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-obs-amber">Manual MRs ({manualMRsList.length})</span>
                    </div>
                    <div className="divide-y divide-obs-border/50">
                      {manualMRsList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(mr => renderMRRow(mr))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="divide-y divide-obs-border/50">
                {filteredMRs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(mr => renderMRRow(mr))}
              </div>
            )
          )}

          {/* ── ISSUES TAB ── */}
          {tab === 'issues' && (
            filteredIssues.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-obs-muted text-sm font-mono">No issues</p>
              </div>
            ) : issueFilter === 'all' ? (
              <>
                {aiIssuesList.length > 0 && (
                  <div>
                    <div className="px-5 py-2.5 flex items-center gap-3 bg-obs-card/30 border-b border-obs-border/40">
                      <div className="w-1.5 h-1.5 rounded-full bg-obs-cyan" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-obs-cyan">Issues Created With AI ({aiIssuesList.length})</span>
                    </div>
                    <div className="divide-y divide-obs-border/50">
                      {aiIssuesList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(issue => renderIssueRow(issue))}
                    </div>
                  </div>
                )}
                {manualIssuesList.length > 0 && (
                  <div>
                    {aiIssuesList.length > 0 && <div className="section-divider" />}
                    <div className="px-5 py-2.5 flex items-center gap-3 bg-obs-card/30 border-b border-obs-border/40">
                      <div className="w-1.5 h-1.5 rounded-full bg-obs-amber" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-obs-amber">Manual Issues ({manualIssuesList.length})</span>
                    </div>
                    <div className="divide-y divide-obs-border/50">
                      {manualIssuesList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(issue => renderIssueRow(issue))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="divide-y divide-obs-border/50">
                {filteredIssues.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(issue => renderIssueRow(issue))}
              </div>
            )
          )}
        </div>

        {/* Pagination — only for commits and when using page-based pagination */}
        {tab === 'commits' && Math.ceil(filteredCommits.length / PAGE_SIZE) > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-obs-border rounded-b-xl">
            <span className="font-mono text-xs text-obs-muted">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredCommits.length)} of {filteredCommits.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded-lg border border-obs-border font-mono text-xs text-obs-text disabled:opacity-30 hover:border-obs-cyan/40 transition-colors"
              >
                ← Prev
              </button>
              <span className="font-mono text-xs text-obs-muted">{page + 1} / {Math.ceil(filteredCommits.length / PAGE_SIZE)}</span>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(filteredCommits.length / PAGE_SIZE) - 1, p + 1))}
                disabled={page === Math.ceil(filteredCommits.length / PAGE_SIZE) - 1}
                className="px-3 py-1 rounded-lg border border-obs-border font-mono text-xs text-obs-text disabled:opacity-30 hover:border-obs-cyan/40 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
