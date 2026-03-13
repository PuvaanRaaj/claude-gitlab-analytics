import { useState } from 'react'
import IssuesChart from '../components/IssuesChart'
import { formatDate } from '../utils/dateHelpers'
import { parseAILabels, extractToolFromLabels, AI_LABEL_PATTERNS } from '../utils/detection'

const PAGE_SIZE = 25

function hasAILabel(labels = []) {
  return labels.some(label => {
    const name = typeof label === 'string' ? label : label?.name || ''
    return AI_LABEL_PATTERNS.some(re => re.test(name))
  })
}

function AiLabelChips({ labels = [] }) {
  const { tool, role, confidence } = parseAILabels(labels)
  const all = [...tool, ...role, ...confidence]
  if (!all.length) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {all.map(l => {
        const lc = l.toLowerCase()
        let cls = 'bg-obs-cyan/10 border-obs-cyan/20 text-obs-cyan'
        if (lc.startsWith('code::'))          cls = 'bg-purple-400/10 border-purple-400/20 text-purple-400'
        if (lc.startsWith('ai-trust::'))      cls = 'bg-obs-amber/10 border-obs-amber/20 text-obs-amber'
        const short = l.replace(/^(code|ai|ai-trust)::/i, '')
        return (
          <span key={l} className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${cls}`}>
            {short}
          </span>
        )
      })}
    </div>
  )
}

export default function IssuesPage({ loading, issues, claudeIssues, currentUser }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(0)

  // Only show issues created by the current user (token owner)
  const myIssues = currentUser
    ? issues.filter(i => i.author?.username === currentUser.username || i.author?.id === currentUser.id)
    : issues

  const closed = myIssues.filter(i => i.state === 'closed')
  const open   = myIssues.filter(i => i.state === 'opened')

  const aiIssueIds = new Set(claudeIssues.map(t => t.issue.id))

  const filtered = myIssues.filter(issue => {
    const isAI = aiIssueIds.has(issue.id) || hasAILabel(issue.labels)
    if (filter === 'ai'     && !isAI) return false
    if (filter === 'manual' &&  isAI) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (issue.title || '').toLowerCase().includes(q) ||
             String(issue.iid).includes(q) ||
             (issue.author?.username || '').toLowerCase().includes(q)
    }
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const aiCount    = myIssues.filter(i => aiIssueIds.has(i.id) || hasAILabel(i.labels)).length

  function handleFilter(f) { setFilter(f); setPage(0) }
  function handleSearch(s) { setSearch(s);  setPage(0) }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total',  value: issues.length, color: 'text-obs-text-bright' },
            { label: 'Open',   value: open.length,   color: 'text-obs-amber' },
            { label: 'Closed', value: closed.length, color: 'text-green-400' },
            { label: 'AI-assisted', value: aiCount,  color: 'text-obs-cyan' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-obs-surface border border-obs-border rounded-xl p-4 text-center">
              <div className={`font-mono text-2xl font-semibold ${color} mb-1`}>{value}</div>
              <div className="font-mono text-xs text-obs-muted">{label}</div>
            </div>
          ))}
        </div>
      )}

      <IssuesChart issues={myIssues} loading={loading} />

      {/* Issues table */}
      <div className="bg-obs-surface border border-obs-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-obs-border flex-wrap gap-3">
          <div>
            <h3 className="font-sans font-semibold text-obs-text-bright text-sm">All Issues</h3>
            <p className="font-mono text-xs text-obs-muted mt-0.5">Issues created in selected period</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search title or author…"
              className="h-8 px-3 w-44 bg-obs-card border border-obs-border rounded-lg font-mono text-xs
                text-obs-text placeholder-obs-muted/50 focus:outline-none focus:border-obs-cyan transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 w-full rounded" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-obs-muted text-sm font-mono">No issues match this filter</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-obs-border/50">
              {pageItems.map(issue => {
                const isAI = aiIssueIds.has(issue.id) || hasAILabel(issue.labels)
                const { tool } = parseAILabels(issue.labels || [])
                return (
                  <div key={issue.id} className="px-5 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors group">
                    {/* Issue number */}
                    <span className="font-mono text-xs text-obs-muted w-12 flex-shrink-0 pt-0.5">
                      #{issue.iid}
                    </span>

                    {/* State dot */}
                    <span className={`inline-flex w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${issue.state === 'closed' ? 'bg-green-500' : 'bg-obs-amber'}`} />

                    {/* Title + labels */}
                    <div className="flex-1 min-w-0">
                      {issue.web_url ? (
                        <a
                          href={issue.web_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-sans text-sm text-obs-text group-hover:text-obs-text-bright hover:text-obs-cyan transition-colors line-clamp-1"
                          title={issue.title}
                        >
                          {issue.title}
                        </a>
                      ) : (
                        <span className="font-sans text-sm text-obs-text group-hover:text-obs-text-bright line-clamp-1">
                          {issue.title}
                        </span>
                      )}
                      <AiLabelChips labels={issue.labels || []} />
                    </div>

                    {/* Author */}
                    {issue.author?.username && (
                      <span className="flex-shrink-0 font-mono text-xs text-obs-muted w-28 text-right truncate" title={issue.author.name}>
                        @{issue.author.username}
                      </span>
                    )}

                    {/* AI badge */}
                    {isAI && (
                      <span className="flex-shrink-0 text-[10px] font-mono bg-obs-cyan/10 border border-obs-cyan/20 text-obs-cyan px-1.5 py-0.5 rounded">
                        {tool[0] ? tool[0].replace(/^code::/i, '') : 'ai'}
                      </span>
                    )}

                    {/* Date */}
                    <span className="font-mono text-xs text-obs-muted flex-shrink-0 w-20 text-right">
                      {formatDate(issue.created_at)}
                    </span>
                  </div>
                )
              })}
            </div>

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
          </>
        )}
      </div>
    </div>
  )
}
