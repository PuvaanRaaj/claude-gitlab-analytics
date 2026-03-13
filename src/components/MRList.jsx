import { useState } from 'react'
import { formatDateTime, formatDuration, reviewDurationHours } from '../utils/dateHelpers'
import { parseAILabels, extractToolFromLabels } from '../utils/detection'

const PAGE_SIZE = 20

// ── Label badge colours ────────────────────────────────────────────────────

const TOOL_COLORS = {
  'code::claude-code': { bg: 'bg-[#00D4FF]/10', border: 'border-[#00D4FF]/30', text: 'text-[#00D4FF]' },
  'code::cursor':      { bg: 'bg-[#F59E0B]/10', border: 'border-[#F59E0B]/30', text: 'text-[#F59E0B]' },
  'code::copilot':     { bg: 'bg-[#22C55E]/10', border: 'border-[#22C55E]/30', text: 'text-[#22C55E]' },
  'code::codex':       { bg: 'bg-[#F97316]/10', border: 'border-[#F97316]/30', text: 'text-[#F97316]' },
  'code::antigravity': { bg: 'bg-[#A78BFA]/10', border: 'border-[#A78BFA]/30', text: 'text-[#A78BFA]' },
  'code::gemini-cli':  { bg: 'bg-[#4ADE80]/10', border: 'border-[#4ADE80]/30', text: 'text-[#4ADE80]' },
}

const ROLE_COLORS = {
  'ai::generated':  'text-obs-cyan',
  'ai::assisted':   'text-blue-400',
  'ai::reviewed':   'text-teal-400',
  'ai::debugged':   'text-obs-amber',
  'ai::refactored': 'text-purple-400',
  'ai::tests':      'text-green-400',
  'ai::docs':       'text-slate-400',
}

const CONFIDENCE_COLORS = {
  'ai-trust::shipped-as-is':   { bg: 'bg-green-500/10',  border: 'border-green-500/30',  text: 'text-green-400' },
  'ai-trust::modified':        { bg: 'bg-obs-amber/10',  border: 'border-obs-amber/30',  text: 'text-obs-amber' },
  'ai-trust::heavily-edited':  { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400'   },
}

const REVIEW_COLORS = {
  'review::ai':         { bg: 'bg-obs-cyan/10',  border: 'border-obs-cyan/30',  text: 'text-obs-cyan' },
  'review::mixed':      { bg: 'bg-purple-400/10',border: 'border-purple-400/30',text: 'text-purple-400' },
  'review::human-only': { bg: 'bg-obs-muted/10', border: 'border-obs-muted/30', text: 'text-obs-muted' },
}

function ToolBadge({ name }) {
  const lc = name.toLowerCase()
  const c  = TOOL_COLORS[lc] || { bg: 'bg-obs-cyan/10', border: 'border-obs-cyan/20', text: 'text-obs-cyan' }
  const short = name.replace(/^code::/i, '')
  return (
    <span className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${c.bg} ${c.border} ${c.text}`}>
      {short}
    </span>
  )
}

function RoleBadge({ name }) {
  const lc    = name.toLowerCase()
  const color = ROLE_COLORS[lc] || 'text-obs-muted'
  const short = name.replace(/^ai::/i, '')
  return (
    <span className={`px-1.5 py-0.5 rounded border border-obs-border font-mono text-[10px] bg-obs-card/50 ${color}`}>
      {short}
    </span>
  )
}

function ConfidenceBadge({ name }) {
  const lc = name.toLowerCase()
  const c  = CONFIDENCE_COLORS[lc] || { bg: 'bg-obs-muted/10', border: 'border-obs-muted/30', text: 'text-obs-muted' }
  const short = name.replace(/^ai-trust::/i, '')
  return (
    <span className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${c.bg} ${c.border} ${c.text}`}>
      {short}
    </span>
  )
}

function ReviewBadge({ name }) {
  const lc = name.toLowerCase()
  const c  = REVIEW_COLORS[lc] || { bg: 'bg-obs-muted/10', border: 'border-obs-muted/30', text: 'text-obs-muted' }
  const short = name.replace(/^review::/i, '')
  return (
    <span className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${c.bg} ${c.border} ${c.text}`}>
      {short}
    </span>
  )
}

function StatusPill({ state }) {
  const styles = {
    opened: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    merged: 'bg-obs-cyan/15 text-obs-cyan border-obs-cyan/30',
    closed: 'bg-obs-muted/15 text-obs-muted border-obs-muted/30',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border font-mono text-[10px] uppercase tracking-wide ${styles[state] || styles.closed}`}>
      {state}
    </span>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function MRList({ taggedMRs, loading }) {
  const [page, setPage]     = useState(0)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  if (loading) {
    return (
      <div className="bg-obs-surface border border-obs-border rounded-xl p-5">
        <div className="skeleton h-3 w-36 rounded mb-5" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-16 w-full rounded mb-2" />
        ))}
      </div>
    )
  }

  const aiCount  = taggedMRs.filter(t => t.isClaudeAssisted).length
  const manCount = taggedMRs.length - aiCount

  const filtered = taggedMRs.filter(({ mr, isClaudeAssisted }) => {
    if (filter === 'ai'     && !isClaudeAssisted) return false
    if (filter === 'manual' &&  isClaudeAssisted) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (mr.title || '').toLowerCase().includes(q) ||
             String(mr.iid).includes(q) ||
             (mr.author?.username || '').toLowerCase().includes(q)
    }
    return true
  })

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleFilter(f) { setFilter(f); setPage(0) }
  function handleSearch(s) { setSearch(s);  setPage(0) }

  return (
    <div
      className="bg-obs-surface border border-obs-border rounded-xl overflow-hidden animate-fade-up"
      style={{ animationDelay: '500ms', animationFillMode: 'both' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-obs-border flex-wrap gap-3">
        <div>
          <h3 className="font-sans font-semibold text-obs-text-bright text-sm">Merge Requests</h3>
          <p className="font-mono text-xs text-obs-muted mt-0.5">
            {taggedMRs.length} total ·{' '}
            <span className="text-obs-cyan">{aiCount} AI-assisted</span> ·{' '}
            <span className="text-obs-amber">{manCount} manual</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter tabs */}
          <div className="flex items-center gap-0.5 bg-obs-card border border-obs-border rounded-lg p-0.5">
            {[
              { val: 'all',    label: 'All' },
              { val: 'ai',     label: 'AI' },
              { val: 'manual', label: 'Manual' },
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => handleFilter(val)}
                className={`px-3 py-1 rounded-md font-mono text-xs transition-all ${
                  filter === val
                    ? 'bg-obs-surface text-obs-cyan border border-obs-cyan/30'
                    : 'text-obs-muted hover:text-obs-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search title or author…"
            className="h-8 px-3 w-48 bg-obs-card border border-obs-border rounded-lg font-mono text-xs
              text-obs-text placeholder-obs-muted/50 focus:outline-none focus:border-obs-cyan transition-colors"
          />
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-5 py-2 border-b border-obs-border bg-obs-card/30">
        <span className="w-12 font-mono text-[10px] text-obs-muted uppercase tracking-widest flex-shrink-0">#</span>
        <span className="flex-1 font-mono text-[10px] text-obs-muted uppercase tracking-widest">Title · Labels</span>
        <span className="w-28 font-mono text-[10px] text-obs-muted uppercase tracking-widest text-right flex-shrink-0">Author</span>
        <span className="w-24 font-mono text-[10px] text-obs-muted uppercase tracking-widest text-right flex-shrink-0">Date</span>
        <span className="w-12 font-mono text-[10px] text-obs-muted uppercase tracking-widest text-right flex-shrink-0">Review</span>
      </div>

      {/* List */}
      {pageItems.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-obs-muted text-sm font-mono">No merge requests match this filter</p>
        </div>
      ) : (
        <div className="divide-y divide-obs-border/50">
          {pageItems.map(({ mr, isClaudeAssisted, reasons }) => {
            const duration  = reviewDurationHours(mr)
            const aiLabels  = parseAILabels(mr.labels || [])
            const tool      = extractToolFromLabels(mr.labels || [])
            return (
              <div key={mr.id} className="px-5 py-3.5 hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-start gap-3">
                  {/* MR number */}
                  <span className="font-mono text-xs text-obs-muted pt-0.5 flex-shrink-0 w-12">
                    !{mr.iid}
                  </span>

                  {/* Title + labels */}
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-start gap-2 mb-1.5">
                      {mr.web_url ? (
                        <a
                          href={mr.web_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-sans text-sm text-obs-text group-hover:text-obs-text-bright hover:text-obs-cyan transition-colors line-clamp-1 flex-1"
                          title={mr.title}
                        >
                          {mr.title}
                        </a>
                      ) : (
                        <span className="font-sans text-sm text-obs-text group-hover:text-obs-text-bright transition-colors line-clamp-1 flex-1">
                          {mr.title}
                        </span>
                      )}
                    </div>

                    {/* Labels row */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusPill state={mr.state} />

                      {/* AI confirmed badge */}
                      {isClaudeAssisted && aiLabels.tool.length === 0 && aiLabels.role.length === 0 && (
                        <span className="px-1.5 py-0.5 rounded border border-obs-cyan/20 font-mono text-[10px] bg-obs-cyan/10 text-obs-cyan">
                          ai
                        </span>
                      )}

                      {/* Tool labels (code::*) */}
                      {aiLabels.tool.map(l => <ToolBadge key={l} name={l} />)}

                      {/* Role labels (ai::*) */}
                      {aiLabels.role.map(l => <RoleBadge key={l} name={l} />)}

                      {/* Review labels */}
                      {aiLabels.review.map(l => <ReviewBadge key={l} name={l} />)}

                      {/* Confidence labels */}
                      {aiLabels.confidence.map(l => <ConfidenceBadge key={l} name={l} />)}

                      {/* Source branch (if no labels to show) */}
                      {aiLabels.tool.length === 0 && aiLabels.role.length === 0 && mr.source_branch && (
                        <span className="font-mono text-[10px] text-obs-muted truncate max-w-[140px]">
                          {mr.source_branch}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Author / assignee */}
                  <div className="flex-shrink-0 w-28 text-right">
                    {mr.author?.username && (
                      <div className="font-mono text-xs text-obs-text truncate" title={mr.author.name}>
                        @{mr.author.username}
                      </div>
                    )}
                    {mr.assignees?.[0]?.username && mr.assignees[0].username !== mr.author?.username && (
                      <div className="font-mono text-[10px] text-obs-muted truncate mt-0.5" title="assignee">
                        → @{mr.assignees[0].username}
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <div className="flex-shrink-0 w-24 text-right">
                    <div className="font-mono text-xs text-obs-muted">{formatDateTime(mr.created_at)}</div>
                  </div>

                  {/* Review duration */}
                  <div className="flex-shrink-0 w-12 text-right">
                    {duration !== null && (
                      <span className="font-mono text-xs text-obs-cyan">{formatDuration(duration)}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-obs-border">
          <span className="font-mono text-xs text-obs-muted">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded-lg border border-obs-border font-mono text-xs text-obs-muted
                disabled:opacity-30 hover:border-obs-cyan/40 hover:text-obs-text transition-colors"
            >
              ← Prev
            </button>
            <span className="font-mono text-xs text-obs-muted px-2">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-3 py-1 rounded-lg border border-obs-border font-mono text-xs text-obs-muted
                disabled:opacity-30 hover:border-obs-cyan/40 hover:text-obs-text transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
