import { useState } from 'react'

const PAGE_SIZE = 25

const DEFINITIVE_REASONS = ['ai_agent_trailer', 'co_author_trailer', 'risk_level_trailer', 'antigravity_pattern', 'cursor_style', 'detailed_conventional_commit']

function AiBadge({ isClaudeAssisted, reasons = [], aiTool }) {
  if (!isClaudeAssisted) {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-obs-amber/10 text-obs-amber border border-obs-amber/20">
        manual
      </span>
    )
  }
  const isDefinitive = reasons.some(r => DEFINITIVE_REASONS.includes(r))
  if (isDefinitive) {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-obs-cyan/10 text-obs-cyan border border-obs-cyan/20">
        {aiTool ? aiTool.toLowerCase() : 'ai'}
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-purple-400/10 text-purple-400 border border-purple-400/20">
      ~ai
    </span>
  )
}

export default function CommitList({ taggedCommits = [], loading }) {
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState('all') // 'all' | 'ai' | 'manual'
  const [search, setSearch] = useState('')

  if (loading) {
    return (
      <div className="bg-obs-surface border border-obs-border rounded-xl p-5">
        <div className="skeleton h-3 w-32 rounded mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-10 w-full rounded" />
          ))}
        </div>
      </div>
    )
  }

  // Filter
  const filtered = taggedCommits.filter(({ commit, isClaudeAssisted }) => {
    if (filter === 'ai'     && !isClaudeAssisted) return false
    if (filter === 'manual' &&  isClaudeAssisted) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (commit.message || '').toLowerCase().includes(q) ||
             (commit.short_id || '').toLowerCase().includes(q)
    }
    return true
  })

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE)
  const pageCommits = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const aiCount  = taggedCommits.filter(t => t.isClaudeAssisted).length
  const manCount = taggedCommits.length - aiCount

  function goPage(n) {
    setPage(Math.max(0, Math.min(totalPages - 1, n)))
  }

  // Reset to page 0 when filter/search changes
  function handleFilter(f) { setFilter(f); setPage(0) }
  function handleSearch(s) { setSearch(s);  setPage(0) }

  return (
    <div
      className="bg-obs-surface border border-obs-border rounded-xl animate-fade-up"
      style={{ animationDelay: '300ms', animationFillMode: 'both' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-obs-border flex-wrap gap-3">
        <div>
          <h3 className="font-sans font-semibold text-obs-text-bright text-sm">My Commits</h3>
          <p className="font-mono text-xs text-obs-muted mt-0.5">
            {taggedCommits.length} commits ·{' '}
            <span className="text-obs-cyan">{aiCount} AI</span> ·{' '}
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
            placeholder="Search message or hash…"
            className="h-8 px-3 w-52 bg-obs-card border border-obs-border rounded-lg font-mono text-xs
              text-obs-text placeholder-obs-muted/50 focus:outline-none focus:border-obs-cyan transition-colors"
          />
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-4 px-5 py-2 border-b border-obs-border bg-obs-card/30">
        <span className="flex-shrink-0 w-20 font-mono text-[10px] text-obs-muted uppercase tracking-widest text-right">Type</span>
        <span className="flex-1 font-mono text-[10px] text-obs-muted uppercase tracking-widest">Message</span>
        <span className="flex-shrink-0 w-16 font-mono text-[10px] text-obs-muted uppercase tracking-widest text-right">Lines</span>
        <span className="flex-shrink-0 w-24 font-mono text-[10px] text-obs-muted uppercase tracking-widest text-right">Date</span>
        <span className="flex-shrink-0 w-20 font-mono text-[10px] text-obs-muted uppercase tracking-widest text-right">Commit</span>
      </div>

      {/* Table */}
      {pageCommits.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="font-mono text-sm text-obs-muted">No commits match this filter</p>
        </div>
      ) : (
        <div className="divide-y divide-obs-border/50">
          {pageCommits.map(({ commit, isClaudeAssisted, reasons, aiTool }) => {
            const firstLine = (commit.message || '').split('\n')[0].trim()
            const date      = commit.authored_date || commit.created_at
            return (
              <div
                key={commit.id || commit.short_id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.03] transition-colors"
              >
                {/* Badge */}
                <div className="flex-shrink-0 w-20 flex justify-end">
                  <AiBadge isClaudeAssisted={isClaudeAssisted} reasons={reasons} aiTool={aiTool} />
                </div>

                {/* Message */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-mono text-xs text-obs-text-bright truncate leading-snug"
                    title={firstLine}
                  >
                    {firstLine}
                  </p>
                  {reasons?.length > 0 && (
                    <p className="font-mono text-[10px] text-obs-muted mt-0.5" title={reasons.join(', ')}>
                      {reasons.slice(0, 3).join(' · ')}{reasons.length > 3 ? ` +${reasons.length - 3}` : ''}
                    </p>
                  )}
                </div>

                {/* Lines changed */}
                <span className="flex-shrink-0 font-mono text-xs text-obs-muted w-16 text-right">
                  {commit.stats?.total > 0 ? `±${commit.stats.total}` : ''}
                </span>

                {/* Date */}
                {date && (
                  <span className="flex-shrink-0 font-mono text-xs text-obs-muted w-24 text-right">
                    {new Date(date).toLocaleDateString()}
                  </span>
                )}

                {/* Hash link */}
                <div className="flex-shrink-0 w-20 text-right">
                  {commit.web_url ? (
                    <a
                      href={commit.web_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-obs-cyan hover:underline"
                    >
                      {commit.short_id}
                    </a>
                  ) : (
                    <span className="font-mono text-xs text-obs-muted">{commit.short_id}</span>
                  )}
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
              onClick={() => goPage(0)}
              disabled={page === 0}
              className="px-2 py-1 rounded font-mono text-xs text-obs-muted disabled:opacity-30 hover:text-obs-text transition-colors"
            >
              «
            </button>
            <button
              onClick={() => goPage(page - 1)}
              disabled={page === 0}
              className="px-3 py-1 rounded-lg border border-obs-border font-mono text-xs text-obs-muted disabled:opacity-30 hover:border-obs-cyan/40 hover:text-obs-text transition-colors"
            >
              ← Prev
            </button>
            <span className="font-mono text-xs text-obs-muted px-2">{page + 1} / {totalPages}</span>
            <button
              onClick={() => goPage(page + 1)}
              disabled={page === totalPages - 1}
              className="px-3 py-1 rounded-lg border border-obs-border font-mono text-xs text-obs-muted disabled:opacity-30 hover:border-obs-cyan/40 hover:text-obs-text transition-colors"
            >
              Next →
            </button>
            <button
              onClick={() => goPage(totalPages - 1)}
              disabled={page === totalPages - 1}
              className="px-2 py-1 rounded font-mono text-xs text-obs-muted disabled:opacity-30 hover:text-obs-text transition-colors"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
