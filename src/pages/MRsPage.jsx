import MRList           from '../components/MRList'
import MRSizeChart      from '../components/MRSizeChart'
import TimeToMergeChart from '../components/TimeToMergeChart'

function hasLabel(mr, name) {
  return (mr.labels || []).some(l => {
    const n = typeof l === 'string' ? l : l?.name || ''
    return n.toLowerCase() === name.toLowerCase()
  })
}

export default function MRsPage({ loading, taggedMRs, currentUser }) {
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
    { label: 'Total MRs',            value: total,           color: 'text-obs-text-bright', sub: `${merged.length} merged` },
    { label: 'Any AI',               value: aiMRs.length,    color: 'text-obs-cyan',        sub: total > 0 ? `${Math.round(aiMRs.length / total * 100)}% of total` : '—' },
    { label: 'Fully AI Generated',   value: fullyAI.length,  color: 'text-obs-cyan',        sub: 'label: ai::generated' },
    { label: 'Partially AI Assisted',value: partialAI.length,color: 'text-blue-400',        sub: 'label: ai::assisted' },
  ]

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cards.map(({ label, value, color, sub }) => (
            <div key={label} className="bg-obs-surface border border-obs-border rounded-xl p-4 text-center">
              <div className={`font-mono text-2xl font-semibold ${color} mb-1`}>{value}</div>
              <div className="font-mono text-xs text-obs-muted">{label}</div>
              <div className="font-mono text-[10px] text-obs-muted/60 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MRSizeChart      taggedMRs={myTaggedMRs} loading={loading} />
        <TimeToMergeChart taggedMRs={myTaggedMRs} loading={loading} />
      </div>
      <MRList taggedMRs={myTaggedMRs} loading={loading} />
    </div>
  )
}
