import { useState } from 'react'
import MRList           from '../components/MRList'
import MRSizeChart      from '../components/MRSizeChart'
import TimeToMergeChart from '../components/TimeToMergeChart'
import { parseAILabels, AI_LABEL_PATTERNS } from '../utils/detection'

function hasLabel(mr, name) {
  return (mr.labels || []).some(l => {
    const n = typeof l === 'string' ? l : l?.name || ''
    return n.toLowerCase() === name.toLowerCase()
  })
}

function hasAILabel(labels = []) {
  return labels.some(label => {
    const name = typeof label === 'string' ? label : label?.name || ''
    return AI_LABEL_PATTERNS.some(re => re.test(name))
  })
}

export default function MRsPage({ loading, taggedMRs, currentUser }) {
  const [filter, setFilter] = useState('all')

  // Only show MRs authored by the current user (token owner)
  const myTaggedMRs = currentUser
    ? taggedMRs.filter(t => t.mr.author?.username === currentUser.username || t.mr.author?.id === currentUser.id)
    : taggedMRs

  const total      = myTaggedMRs.length
  const aiMRs      = myTaggedMRs.filter(t => t.isClaudeAssisted)
  const fullyAI    = myTaggedMRs.filter(t => hasLabel(t.mr, 'ai::generated'))
  const partialAI  = myTaggedMRs.filter(t => hasLabel(t.mr, 'ai::assisted'))
  const merged     = myTaggedMRs.filter(t => t.mr.state === 'merged')

  const cards = [
    { label: 'Total MRs',            value: total,           accent: 'cyan',   sub: `${merged.length} merged` },
    { label: 'Any AI',               value: aiMRs.length,    accent: 'cyan',   sub: total > 0 ? `${Math.round(aiMRs.length / total * 100)}% of total` : '—' },
    { label: 'Fully AI Generated',   value: fullyAI.length,  accent: 'purple', sub: 'label: ai::generated' },
    { label: 'Partially AI Assisted',value: partialAI.length,accent: 'amber',  sub: 'label: ai::assisted' },
  ]

  // Filter for the MRList sub-component — pass through
  const filteredTaggedMRs = filter === 'all'
    ? myTaggedMRs
    : filter === 'ai'
      ? myTaggedMRs.filter(t => t.isClaudeAssisted || hasAILabel(t.mr.labels))
      : myTaggedMRs.filter(t => !t.isClaudeAssisted && !hasAILabel(t.mr.labels))

  // Container border accent
  const containerAccent = filter === 'ai'
    ? 'border-l-[3px] border-l-obs-cyan'
    : filter === 'manual'
      ? 'border-l-[3px] border-l-obs-amber'
      : ''

  const accentMap = {
    cyan:   { color: '#00C9FF', text: 'text-[#00C9FF]' },
    amber:  { color: '#F4A024', text: 'text-[#F4A024]' },
    purple: { color: '#A78BFA', text: 'text-[#A78BFA]' },
    green:  { color: '#22C55E', text: 'text-green-400' },
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cards.map(({ label, value, accent, sub }) => {
            const a = accentMap[accent] || accentMap.cyan
            return (
              <div key={label} className="relative bg-obs-surface border border-obs-border rounded-xl p-4 overflow-hidden card-hover">
                <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl" style={{ background: `linear-gradient(90deg, transparent, ${a.color}40, transparent)` }} />
                <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full" style={{ background: a.color, opacity: 0.5 }} />
                <div className="pl-3 text-center">
                  <div className={`font-display text-2xl font-semibold ${a.text} mb-1`}>{value}</div>
                  <div className="font-mono text-xs text-obs-muted">{label}</div>
                  {sub && <div className="font-mono text-[10px] text-obs-muted/60 mt-0.5">{sub}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* AI/Manual filter tabs above the MR list */}
      {!loading && (
        <div className={`bg-obs-surface border border-obs-border rounded-xl overflow-hidden ${containerAccent}`}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-obs-border">
            <div>
              <h3 className="font-display font-semibold text-obs-text-bright text-sm">Merge Request Overview</h3>
              <p className="font-mono text-xs text-obs-muted mt-0.5">
                {total} total ·{' '}
                <span className="text-obs-cyan">{aiMRs.length} AI</span> ·{' '}
                <span className="text-obs-amber">{total - aiMRs.length} manual</span>
              </p>
            </div>
            <div className="flex items-center gap-0 border-b border-obs-border">
              {[
                { val: 'all',    label: 'All' },
                { val: 'ai',     label: 'AI' },
                { val: 'manual', label: 'Manual' },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  className={`relative px-4 py-2 font-mono text-xs transition-all ${
                    filter === val
                      ? val === 'ai' ? 'text-obs-cyan' : val === 'manual' ? 'text-obs-amber' : 'text-obs-text-bright'
                      : 'text-obs-muted hover:text-obs-text'
                  }`}
                >
                  {label}
                  {filter === val && (
                    <span className={`absolute bottom-0 left-1 right-1 h-[2px] rounded-full ${
                      val === 'ai' ? 'bg-obs-cyan' : val === 'manual' ? 'bg-obs-amber' : 'bg-obs-text-bright'
                    }`} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section headers when "all" filter is active */}
          {filter === 'all' && (
            <div className="divide-y divide-obs-border/30">
              {aiMRs.length > 0 && (
                <div className="px-5 py-2.5 flex items-center gap-3 bg-obs-card/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-obs-cyan" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-obs-cyan">MRs Created by AI ({aiMRs.length})</span>
                </div>
              )}
              {(total - aiMRs.length) > 0 && (
                <div className="px-5 py-2.5 flex items-center gap-3 bg-obs-card/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-obs-amber" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-obs-amber">Manual MRs ({total - aiMRs.length})</span>
                </div>
              )}
            </div>
          )}
          {filter === 'ai' && aiMRs.length > 0 && (
            <div className="px-5 py-2.5 flex items-center gap-3 bg-obs-card/30 border-b border-obs-border/40">
              <div className="w-1.5 h-1.5 rounded-full bg-obs-cyan" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-obs-cyan">MRs Created by AI ({aiMRs.length})</span>
            </div>
          )}
          {filter === 'manual' && (total - aiMRs.length) > 0 && (
            <div className="px-5 py-2.5 flex items-center gap-3 bg-obs-card/30 border-b border-obs-border/40">
              <div className="w-1.5 h-1.5 rounded-full bg-obs-amber" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-obs-amber">Manual MRs ({total - aiMRs.length})</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MRSizeChart      taggedMRs={myTaggedMRs} loading={loading} />
        <TimeToMergeChart taggedMRs={myTaggedMRs} loading={loading} />
      </div>
      <MRList taggedMRs={filteredTaggedMRs} loading={loading} />
    </div>
  )
}
