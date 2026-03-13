import { useState } from 'react'
import { parseAILabels, AI_LABEL_PATTERNS } from '../utils/detection'

function hasAILabel(labels = []) {
  return labels.some(l => {
    const name = typeof l === 'string' ? l : l?.name || ''
    return AI_LABEL_PATTERNS.some(re => re.test(name))
  })
}

// Normalize author name for deduplication: remove spaces, lowercase
// "PuvaanRaaj" and "Puvaan Raaj" both → "puvaanraaj"
function normalizeAuthor(name) {
  return name.replace(/[\s._-]+/g, '').toLowerCase()
}

// Pick the most readable display name: prefer the variant with spaces
function bestDisplayName(names) {
  return [...names].sort((a, b) => {
    const aHasSpace = /\s/.test(a)
    const bHasSpace = /\s/.test(b)
    if (aHasSpace && !bHasSpace) return -1
    if (!aHasSpace && bHasSpace) return 1
    return b.length - a.length // longer = more info
  })[0]
}

const DEFINITIVE_REASONS = ['ai_agent_trailer', 'co_author_trailer', 'risk_level_trailer', 'antigravity_pattern', 'cursor_style', 'detailed_conventional_commit']

function buildAuthorData(taggedCommits, memberUsernameMap = new Map()) {
  const norm = s => (s || '').replace(/[\s._-]+/g, '').toLowerCase()
  const map = new Map()
  for (const { commit, isClaudeAssisted, reasons = [] } of taggedCommits) {
    const raw = commit.author_name || 'Unknown'
    const key = norm(raw)
    if (!map.has(key)) map.set(key, { names: new Set(), total: 0, definitive: 0, heuristic: 0 })
    const entry = map.get(key)
    entry.names.add(raw)
    entry.total++
    if (isClaudeAssisted) {
      const isDefinitive = reasons.some(r => DEFINITIVE_REASONS.includes(r))
      if (isDefinitive) entry.definitive++
      else entry.heuristic++
    }
  }
  return Array.from(map.entries())
    .map(([key, e]) => {
      // Resolve GitLab username: try normalised display name first, then each name variant
      const username =
        memberUsernameMap.get(key) ||
        [...e.names].reduce((found, n) => found || memberUsernameMap.get(norm(n)), null) ||
        null
      const displayName = username ? `@${username}` : bestDisplayName(e.names)
      return {
        key,
        username: username || null,
        author: displayName,
        displayName: username ? bestDisplayName(e.names) : null, // original name shown in tooltip
        aliases: e.names.size > 1 ? [...e.names].join(' · ') : null,
        total: e.total,
        definitive: e.definitive,
        heuristic: e.heuristic,
        manual: e.total - e.definitive - e.heuristic,
        aiPct: e.total > 0 ? Math.round(((e.definitive + e.heuristic) / e.total) * 100) : 0,
        defPct: e.total > 0 ? Math.round((e.definitive / e.total) * 100) : 0,
      }
    })
    .sort((a, b) => (b.definitive + b.heuristic) - (a.definitive + a.heuristic))
}

function HoverTooltip({ data, visible }) {
  if (!visible || !data) return null
  return (
    <div className="pointer-events-none absolute z-30 bg-obs-card border border-obs-border rounded-lg p-3 text-xs font-mono shadow-lg whitespace-nowrap"
      style={{ bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' }}>
      <p className="text-obs-text-bright font-semibold mb-1">{data.author}</p>
      {data.displayName && (
        <p className="text-obs-muted text-[10px] mb-1">{data.displayName}</p>
      )}
      {data.aliases && (
        <p className="text-obs-muted text-[10px] mb-2 max-w-[200px] leading-tight">aka {data.aliases}</p>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-obs-text">Total</span>
        <span className="text-obs-text-bright text-right">{data.total.toLocaleString()}</span>
        <span className="text-obs-cyan">AI (confirmed)</span>
        <span className="text-obs-text-bright text-right">{data.definitive.toLocaleString()}</span>
        <span className="text-purple-400">Heuristic</span>
        <span className="text-obs-text-bright text-right">{data.heuristic.toLocaleString()}</span>
        <span className="text-obs-amber">Manual</span>
        <span className="text-obs-text-bright text-right">{data.manual.toLocaleString()}</span>
        <span className="text-obs-text border-t border-obs-border pt-1">AI %</span>
        <span className="text-obs-cyan font-semibold text-right border-t border-obs-border pt-1">{data.aiPct}%</span>
      </div>
      <p className="text-obs-muted text-[10px] mt-2">Click to view commits</p>
    </div>
  )
}

function AuthorRow({ entry, maxTotal, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const barWidth    = maxTotal > 0 ? (entry.total / maxTotal) * 100 : 0
  const defWidth    = entry.total > 0 ? (entry.definitive / entry.total) * 100 : 0
  const heurWidth   = entry.total > 0 ? (entry.heuristic  / entry.total) * 100 : 0
  const manualWidth = 100 - defWidth - heurWidth

  return (
    <div
      className="relative flex items-center gap-3 group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(entry)}
    >
      {/* Author name */}
      <div className="w-28 flex-shrink-0 text-right">
        <span
          className="font-mono text-xs text-obs-text-bright truncate block group-hover:text-obs-cyan transition-colors underline-offset-2 group-hover:underline"
          title={entry.author}
        >
          {entry.author}
        </span>
      </div>

      {/* Bar track */}
      <div className="flex-1 relative h-5 bg-obs-border/40 rounded overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full flex rounded overflow-hidden transition-all duration-500"
          style={{ width: `${barWidth}%` }}
        >
          <div style={{ width: `${defWidth}%`,    background: '#00D4FF' }} title="AI (confirmed)" />
          <div style={{ width: `${heurWidth}%`,   background: '#A78BFA' }} title="Heuristic" />
          <div style={{ width: `${manualWidth}%`, background: '#F59E0B' }} title="Manual" />
        </div>
      </div>

      {/* Stats */}
      <div className="w-56 flex-shrink-0 text-right">
        <span className="font-mono text-xs text-obs-text whitespace-nowrap">
          {entry.total.toLocaleString()} ·{' '}
          {entry.definitive > 0 && <span className="text-obs-cyan font-semibold">{entry.defPct}% AI </span>}
          {entry.heuristic  > 0 && <span className="text-purple-400 font-semibold">{Math.round((entry.heuristic/entry.total)*100)}% ~AI</span>}
          {entry.definitive === 0 && entry.heuristic === 0 && <span className="text-obs-amber">0% AI</span>}
        </span>
      </div>

      {/* Tooltip */}
      <HoverTooltip data={entry} visible={hovered} />
    </div>
  )
}

// ─── Commit Drill-Down Modal ──────────────────────────────────────────────────

const COMMITS_PAGE_SIZE = 20

function commitSignalBadge(isClaudeAssisted, reasons = [], aiTool) {
  if (!isClaudeAssisted) {
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-obs-amber/10 text-obs-amber">manual</span>
  }
  const isDefinitive = reasons.some(r => DEFINITIVE_REASONS.includes(r))
  if (isDefinitive) {
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-obs-cyan/10 text-obs-cyan">
        {aiTool ? aiTool.toLowerCase() : 'ai'}
      </span>
    )
  }
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-400/10 text-purple-400">
      ~ai · {reasons.filter(r => !DEFINITIVE_REASONS.includes(r)).join(', ')}
    </span>
  )
}

function UserModal({ author, taggedCommits, mrs = [], issues = [], onClose }) {
  const [tab, setTab]   = useState('commits')
  const [page, setPage] = useState(0)

  // ── Commits ──
  const commits     = taggedCommits.filter(t => normalizeAuthor(t.commit.author_name || '') === author.key)
  const aiCount     = commits.filter(t => t.isClaudeAssisted && t.reasons?.some(r => DEFINITIVE_REASONS.includes(r))).length
  const heurCount   = commits.filter(t => t.isClaudeAssisted && !t.reasons?.some(r => DEFINITIVE_REASONS.includes(r))).length

  // ── AI MRs — author/assignee matches + has AI label ──
  function mrBelongsToUser(mr) {
    if (author.username) {
      return mr.author?.username?.toLowerCase() === author.username.toLowerCase() ||
             mr.assignees?.some(a => a.username?.toLowerCase() === author.username.toLowerCase())
    }
    return normalizeAuthor(mr.author?.name || '') === author.key
  }
  const aiMRs = mrs.filter(mr => mrBelongsToUser(mr) && hasAILabel(mr.labels || []))

  // ── AI Issues — author matches + has AI label ──
  function issueBelongsToUser(issue) {
    if (author.username) return issue.author?.username?.toLowerCase() === author.username.toLowerCase()
    return normalizeAuthor(issue.author?.name || '') === author.key
  }
  const aiIssues = issues.filter(issue => issueBelongsToUser(issue) && hasAILabel(issue.labels || []))

  // Reset page on tab switch
  function switchTab(t) { setTab(t); setPage(0) }

  const TABS = [
    { id: 'commits', label: 'Commits', count: commits.length },
    { id: 'mrs',     label: 'AI MRs',  count: aiMRs.length },
    { id: 'issues',  label: 'AI Issues', count: aiIssues.length },
  ]

  // Pagination for active tab
  const activeItems = tab === 'commits' ? commits : tab === 'mrs' ? aiMRs : aiIssues
  const totalPages  = Math.ceil(activeItems.length / COMMITS_PAGE_SIZE)
  const pageItems   = activeItems.slice(page * COMMITS_PAGE_SIZE, (page + 1) * COMMITS_PAGE_SIZE)

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-3xl bg-obs-surface border border-obs-border rounded-2xl shadow-2xl flex flex-col max-h-[82vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-obs-border flex-shrink-0">
          <div>
            <h3 className="font-sans font-semibold text-obs-text-bright text-base">{author.author}</h3>
            {author.displayName && <p className="font-mono text-xs text-obs-muted mt-0.5">{author.displayName}</p>}
            {author.aliases    && <p className="font-mono text-[10px] text-obs-muted/70 mt-0.5">aka {author.aliases}</p>}
            <div className="flex items-center gap-3 mt-2">
              <span className="font-mono text-xs text-obs-text">{commits.length} commits</span>
              {aiCount   > 0 && <span className="font-mono text-xs text-obs-cyan">{aiCount} AI</span>}
              {heurCount > 0 && <span className="font-mono text-xs text-purple-400">{heurCount} ~AI</span>}
              {aiMRs.length   > 0 && <span className="font-mono text-xs text-obs-amber">{aiMRs.length} AI MRs</span>}
              {aiIssues.length > 0 && <span className="font-mono text-xs text-green-400">{aiIssues.length} AI issues</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-obs-muted hover:text-obs-text transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 px-5 py-2 border-b border-obs-border flex-shrink-0 bg-obs-card/30">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-xs transition-all ${
                tab === t.id
                  ? 'bg-obs-surface text-obs-cyan border border-obs-cyan/30'
                  : 'text-obs-muted hover:text-obs-text'
              }`}
            >
              {t.label}
              <span className={`px-1 py-0.5 rounded text-[9px] ${tab === t.id ? 'bg-obs-cyan/20 text-obs-cyan' : 'bg-obs-border text-obs-muted'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {pageItems.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-obs-muted text-sm font-mono">
                {tab === 'commits' ? 'No commits' : tab === 'mrs' ? 'No AI-labelled MRs found' : 'No AI-labelled issues found'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-obs-border/50">

              {/* ── COMMITS TAB ── */}
              {tab === 'commits' && pageItems.map(({ commit, isClaudeAssisted, reasons, aiTool }) => {
                const firstLine = (commit.message || '').split('\n')[0].trim()
                const hasBody   = (commit.message || '').split('\n').filter(l => l.trim()).length > 1
                const date      = commit.authored_date || commit.created_at
                return (
                  <div key={commit.id || commit.short_id} className="px-5 py-3 hover:bg-obs-card/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-0.5">{commitSignalBadge(isClaudeAssisted, reasons, aiTool)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-obs-text-bright leading-snug truncate" title={firstLine}>{firstLine}</p>
                        {hasBody && (
                          <p className="font-mono text-[10px] text-obs-muted mt-0.5 truncate">
                            {(commit.message || '').split('\n').filter(l => l.trim()).slice(1, 3).join(' · ')}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          {commit.web_url
                            ? <a href={commit.web_url} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-obs-cyan hover:underline">{commit.short_id}</a>
                            : <span className="font-mono text-[10px] text-obs-muted">{commit.short_id}</span>}
                          {date && <span className="font-mono text-[10px] text-obs-muted">{new Date(date).toLocaleDateString()}</span>}
                          {commit.stats?.total > 0 && <span className="font-mono text-[10px] text-obs-muted">±{commit.stats.total}</span>}
                          {reasons?.length > 0 && <span className="font-mono text-[10px] text-obs-muted/60">{reasons.slice(0, 2).join(', ')}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* ── AI MRs TAB ── */}
              {tab === 'mrs' && pageItems.map(mr => {
                const { tool, role, confidence } = parseAILabels(mr.labels || [])
                const allAILabels = [...tool, ...role, ...confidence]
                return (
                  <div key={mr.id} className="px-5 py-3.5 hover:bg-obs-card/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-xs text-obs-muted flex-shrink-0 w-10 pt-0.5">!{mr.iid}</span>
                      <div className="flex-1 min-w-0">
                        {mr.web_url
                          ? <a href={mr.web_url} target="_blank" rel="noopener noreferrer" className="font-sans text-sm text-obs-text-bright hover:text-obs-cyan transition-colors line-clamp-1">{mr.title}</a>
                          : <p className="font-sans text-sm text-obs-text-bright line-clamp-1">{mr.title}</p>}
                        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                          <span className={`px-1.5 py-0.5 rounded border font-mono text-[10px] uppercase tracking-wide ${
                            mr.state === 'merged' ? 'bg-obs-cyan/15 text-obs-cyan border-obs-cyan/30' :
                            mr.state === 'opened' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                            'bg-obs-muted/15 text-obs-muted border-obs-muted/30'
                          }`}>{mr.state}</span>
                          {allAILabels.map(l => (
                            <span key={l} className="px-1.5 py-0.5 rounded border border-obs-cyan/20 font-mono text-[10px] bg-obs-cyan/10 text-obs-cyan">
                              {l.replace(/^(code|ai|ai-trust|review)::/i, '')}
                            </span>
                          ))}
                          {mr.assignees?.[0] && (
                            <span className="font-mono text-[10px] text-obs-muted">→ @{mr.assignees[0].username}</span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-obs-muted flex-shrink-0 text-right">
                        {mr.created_at ? new Date(mr.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* ── AI ISSUES TAB ── */}
              {tab === 'issues' && pageItems.map(issue => {
                const { tool, role } = parseAILabels(issue.labels || [])
                const allAILabels = [...tool, ...role]
                return (
                  <div key={issue.id} className="px-5 py-3.5 hover:bg-obs-card/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-xs text-obs-muted flex-shrink-0 w-12 pt-0.5">#{issue.iid}</span>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${issue.state === 'closed' ? 'bg-green-500' : 'bg-obs-amber'}`} />
                      <div className="flex-1 min-w-0">
                        {issue.web_url
                          ? <a href={issue.web_url} target="_blank" rel="noopener noreferrer" className="font-sans text-sm text-obs-text-bright hover:text-obs-cyan transition-colors line-clamp-1">{issue.title}</a>
                          : <p className="font-sans text-sm text-obs-text-bright line-clamp-1">{issue.title}</p>}
                        {allAILabels.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            {allAILabels.map(l => (
                              <span key={l} className="px-1.5 py-0.5 rounded border border-obs-cyan/20 font-mono text-[10px] bg-obs-cyan/10 text-obs-cyan">
                                {l.replace(/^(code|ai|ai-trust|review)::/i, '')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="font-mono text-xs text-obs-muted flex-shrink-0 text-right">
                        {issue.created_at ? new Date(issue.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                )
              })}

            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-obs-border flex-shrink-0">
            <span className="font-mono text-xs text-obs-muted">
              {page * COMMITS_PAGE_SIZE + 1}–{Math.min((page + 1) * COMMITS_PAGE_SIZE, activeItems.length)} of {activeItems.length}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1 rounded-lg border border-obs-border font-mono text-xs text-obs-text disabled:opacity-30 hover:border-obs-cyan/40 transition-colors">
                ← Prev
              </button>
              <span className="font-mono text-xs text-obs-muted">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                className="px-3 py-1 rounded-lg border border-obs-border font-mono text-xs text-obs-text disabled:opacity-30 hover:border-obs-cyan/40 transition-colors">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

async function exportToPDF(allData) {
  const { jsPDF } = await import('jspdf')

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const PW = 297
  const PH = 210
  const ML = 14
  const MR = 14
  const MT = 14
  const contentW = PW - ML - MR

  const BG      = [13,  17,  23]
  const SURFACE = [22,  27,  38]
  const BORDER  = [30,  37,  54]
  const MUTED   = [75,  86, 128]
  const TEXT    = [180, 192, 220]
  const BRIGHT  = [230, 237, 255]
  const CYAN    = [0,   212, 255]
  const AMBER   = [245, 158,  11]

  const maxTotal = allData[0]?.total ?? 1
  const ROW_H    = 7
  const BAR_H    = 3.5
  const NAME_W   = 42
  const STATS_W  = 44
  const BAR_W    = contentW - NAME_W - STATS_W - 4

  const ROWS_PER_PAGE = Math.floor((PH - MT - 24) / ROW_H)

  function drawPageBackground() {
    pdf.setFillColor(...BG)
    pdf.rect(0, 0, PW, PH, 'F')
  }

  function drawHeader(page, totalPages) {
    pdf.setFillColor(...SURFACE)
    pdf.roundedRect(ML, MT, contentW, 12, 2, 2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(...BRIGHT)
    pdf.text('Team AI Adoption', ML + 4, MT + 7.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...MUTED)
    pdf.text(`${allData.length} authors · sorted by AI commits · ${new Date().toLocaleDateString()}`, ML + 4, MT + 11)
    pdf.setFillColor(...CYAN)
    pdf.rect(PW - MR - 30, MT + 4, 3, 3, 'F')
    pdf.setTextColor(...MUTED)
    pdf.setFontSize(7)
    pdf.text('AI', PW - MR - 26, MT + 7)
    pdf.setFillColor(...AMBER)
    pdf.rect(PW - MR - 18, MT + 4, 3, 3, 'F')
    pdf.text('Manual', PW - MR - 14, MT + 7)
    pdf.setTextColor(...MUTED)
    pdf.setFontSize(7)
    pdf.text(`Page ${page} / ${totalPages}`, PW - MR - 18, MT + 12.5)
  }

  const totalPages = Math.ceil(allData.length / ROWS_PER_PAGE)

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) pdf.addPage()
    drawPageBackground()
    drawHeader(p + 1, totalPages)

    const startIdx = p * ROWS_PER_PAGE
    const pageRows = allData.slice(startIdx, startIdx + ROWS_PER_PAGE)
    let y = MT + 18

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(...MUTED)
    pdf.text('AUTHOR', ML + NAME_W - 1, y, { align: 'right' })
    pdf.text('COMMITS · AI%', ML + NAME_W + 4 + BAR_W + 2, y)
    y += 3

    pdf.setDrawColor(...BORDER)
    pdf.setLineWidth(0.2)
    pdf.line(ML, y, ML + contentW, y)
    y += 3

    pageRows.forEach((entry, i) => {
      const rowY = y + i * ROW_H
      const barTrackX = ML + NAME_W + 2
      const barMaxW = BAR_W
      const filledW = maxTotal > 0 ? (entry.total / maxTotal) * barMaxW : 0
      const aiW = entry.total > 0 ? ((entry.definitive + entry.heuristic) / entry.total) * filledW : 0
      const manW = filledW - aiW

      if (i % 2 === 0) {
        pdf.setFillColor(22, 28, 40)
        pdf.rect(ML, rowY - 2, contentW, ROW_H, 'F')
      }

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(...TEXT)
      const displayName = entry.author.length > 18 ? entry.author.slice(0, 17) + '…' : entry.author
      pdf.text(displayName, ML + NAME_W - 1, rowY + 2, { align: 'right' })

      pdf.setFillColor(...BORDER)
      pdf.roundedRect(barTrackX, rowY - 1, barMaxW, BAR_H, 0.5, 0.5, 'F')

      if (aiW > 0) {
        pdf.setFillColor(...CYAN)
        pdf.roundedRect(barTrackX, rowY - 1, aiW, BAR_H, 0.5, 0.5, 'F')
      }
      if (manW > 0) {
        pdf.setFillColor(...AMBER)
        pdf.roundedRect(barTrackX + aiW, rowY - 1, manW, BAR_H, 0.5, 0.5, 'F')
      }

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7.5)
      pdf.setTextColor(...MUTED)
      const statsX = barTrackX + BAR_W + 3
      pdf.text(`${entry.total.toLocaleString()}`, statsX, rowY + 2)
      pdf.setTextColor(...CYAN)
      pdf.text(` · ${entry.aiPct}% AI`, statsX + pdf.getTextWidth(`${entry.total.toLocaleString()}`), rowY + 2)
    })
  }

  const date = new Date().toISOString().slice(0, 10)
  pdf.save(`team-ai-adoption-${date}.pdf`)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeamBreakdown({ taggedCommits = [], mrs = [], issues = [], loading, memberUsernameMap }) {
  const [showAll, setShowAll] = useState(false)
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [selectedAuthor, setSelectedAuthor] = useState(null)

  if (loading) {
    return (
      <div className="bg-obs-surface border border-obs-border rounded-xl p-5">
        <div className="skeleton h-3 w-32 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-5 w-full rounded" />
          ))}
        </div>
      </div>
    )
  }

  const allData = buildAuthorData(taggedCommits, memberUsernameMap)
  const filtered = search.trim()
    ? allData.filter(e => e.author.toLowerCase().includes(search.toLowerCase()))
    : allData
  const data = (search.trim() || showAll) ? filtered : filtered.slice(0, PAGE_SIZE)
  const maxTotal = allData[0]?.total ?? 1

  if (!allData.length) {
    return (
      <div
        className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up"
        style={{ animationDelay: '350ms', animationFillMode: 'both' }}
      >
        <h3 className="font-sans font-semibold text-obs-text-bright text-sm mb-1">Team AI Adoption</h3>
        <p className="font-mono text-xs text-obs-text mb-4">Commits per author — AI vs manual</p>
        <div className="h-32 flex items-center justify-center">
          <p className="text-obs-muted text-sm font-mono">No commit author data available</p>
        </div>
      </div>
    )
  }

  async function handleExport() {
    setExporting(true)
    await exportToPDF(allData)
    setExporting(false)
  }

  return (
    <>
      <div
        className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up"
        style={{ animationDelay: '350ms', animationFillMode: 'both' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-sans font-semibold text-obs-text-bright text-sm">Team AI Adoption</h3>
            <p className="font-mono text-xs text-obs-text mt-0.5">{allData.length} authors · click a name to view commits</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-obs-cyan inline-block" />
              <span className="text-obs-text">AI</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 inline-block" />
              <span className="text-obs-text">Heuristic</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-obs-amber inline-block" />
              <span className="text-obs-text">Manual</span>
            </span>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-obs-border text-obs-muted hover:text-obs-text hover:border-obs-cyan/40 transition-colors disabled:opacity-40"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              {exporting ? 'Exporting…' : 'PDF'}
            </button>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search author name…"
          className="w-full mb-3 h-8 px-3 bg-obs-card border border-obs-border rounded-lg font-mono text-xs text-obs-text placeholder-obs-muted/50 focus:outline-none focus:border-obs-cyan transition-colors"
        />

        <div className="space-y-2.5">
          {data.map(entry => (
            <AuthorRow
              key={entry.author}
              entry={entry}
              maxTotal={maxTotal}
              onSelect={setSelectedAuthor}
            />
          ))}
        </div>

        {!search.trim() && filtered.length > PAGE_SIZE && (
          <button
            onClick={() => setShowAll(s => !s)}
            className="mt-4 w-full font-mono text-xs text-obs-muted hover:text-obs-text border border-obs-border rounded-lg py-2 transition-colors"
          >
            {showAll ? 'Show less' : `Show all ${filtered.length} authors`}
          </button>
        )}
      </div>

      {selectedAuthor && (
        <UserModal
          author={selectedAuthor}
          taggedCommits={taggedCommits}
          mrs={mrs}
          issues={issues}
          onClose={() => setSelectedAuthor(null)}
        />
      )}
    </>
  )
}
