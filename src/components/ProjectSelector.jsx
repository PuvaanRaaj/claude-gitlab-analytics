import { useState, useRef, useEffect } from 'react'

export default function ProjectSelector({ projects, selectedIds, onChange, loading }) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Group projects by namespace
  const groups = {}
  projects.forEach(p => {
    const ns = p.namespace?.name || 'Other'
    if (!groups[ns]) groups[ns] = []
    groups[ns].push(p)
  })

  // Filter within groups based on search
  const filteredGroups = Object.entries(groups)
    .map(([ns, ps]) => ({
      ns,
      projects: ps.filter(p =>
        !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        ns.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(g => g.projects.length > 0)

  function toggle(id) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  function toggleGroup(ns) {
    const groupIds = groups[ns].map(p => p.id)
    const allSelected = groupIds.every(id => selectedIds.includes(id))
    if (allSelected) {
      // Deselect the whole group
      onChange(selectedIds.filter(id => !groupIds.includes(id)))
    } else {
      // Select all in group (merge, no duplicates)
      onChange([...new Set([...selectedIds, ...groupIds])])
    }
  }

  function groupState(ns) {
    const groupIds = groups[ns]?.map(p => p.id) || []
    const selectedCount = groupIds.filter(id => selectedIds.includes(id)).length
    if (selectedCount === 0)              return 'none'
    if (selectedCount === groupIds.length) return 'all'
    return 'partial'
  }

  function selectAll()  { onChange(projects.map(p => p.id)) }
  function clearAll()   { onChange([]) }

  const label = selectedIds.length === 0
    ? 'All projects'
    : selectedIds.length === 1
      ? projects.find(p => p.id === selectedIds[0])?.name || '1 project'
      : `${selectedIds.length} projects`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center gap-2 h-9 px-3 bg-obs-surface border border-obs-border rounded-lg
          font-mono text-xs text-obs-text hover:border-obs-border2 transition-colors disabled:opacity-50 min-w-[160px]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-obs-muted flex-shrink-0">
          <path d="M3 7h18M6 12h12M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span className="truncate flex-1 text-left">{label}</span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          className={`text-obs-muted flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-30 w-72 bg-obs-surface border border-obs-border rounded-xl shadow-card overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-obs-border">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects or groups…"
              autoFocus
              className="w-full bg-obs-card border border-obs-border rounded-lg px-3 py-2 font-mono text-xs
                text-obs-text placeholder-obs-muted focus:outline-none focus:border-obs-cyan transition-colors"
            />
          </div>

          {/* Select all / clear */}
          <div className="flex px-3 py-2 gap-3 border-b border-obs-border">
            <button onClick={selectAll} className="font-mono text-xs text-obs-cyan hover:text-obs-text transition-colors">
              All
            </button>
            <button onClick={clearAll} className="font-mono text-xs text-obs-muted hover:text-obs-text transition-colors">
              None
            </button>
            <span className="ml-auto font-mono text-[10px] text-obs-muted self-center">
              {selectedIds.length}/{projects.length}
            </span>
          </div>

          {/* Grouped list */}
          <div className="max-h-72 overflow-y-auto py-1">
            {filteredGroups.length === 0 ? (
              <p className="px-4 py-3 text-obs-muted text-xs font-mono">No projects found</p>
            ) : (
              filteredGroups.map(({ ns, projects: groupProjects }) => {
                const state = groupState(ns)
                return (
                  <div key={ns}>
                    {/* Group header — click to toggle whole group */}
                    <button
                      onClick={() => toggleGroup(ns)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] transition-colors group"
                    >
                      {/* Tri-state checkbox */}
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        state === 'all'
                          ? 'bg-obs-cyan border-obs-cyan'
                          : state === 'partial'
                            ? 'bg-obs-cyan/30 border-obs-cyan/60'
                            : 'border-obs-border2'
                      }`}>
                        {state === 'all' && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17l-5-5" stroke="#080B14" strokeWidth="3" strokeLinecap="round"/>
                          </svg>
                        )}
                        {state === 'partial' && (
                          <span className="w-1.5 h-0.5 bg-obs-cyan rounded-full block" />
                        )}
                      </div>

                      <span className="font-mono text-[11px] font-semibold text-obs-text uppercase tracking-wider flex-1 text-left">
                        {ns}
                      </span>
                      <span className="font-mono text-[10px] text-obs-muted">
                        {groupProjects.filter(p => selectedIds.includes(p.id)).length}/{groupProjects.length}
                      </span>
                    </button>

                    {/* Projects within group */}
                    {groupProjects.map(p => {
                      const selected = selectedIds.includes(p.id)
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggle(p.id)}
                          className="w-full flex items-center gap-2.5 pl-9 pr-3 py-2 hover:bg-white/[0.03] transition-colors"
                        >
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                            selected ? 'bg-obs-cyan border-obs-cyan' : 'border-obs-border2'
                          }`}>
                            {selected && (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17l-5-5" stroke="#080B14" strokeWidth="3.5" strokeLinecap="round"/>
                              </svg>
                            )}
                          </div>
                          <span className="font-mono text-xs text-obs-text truncate">{p.name}</span>
                        </button>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
