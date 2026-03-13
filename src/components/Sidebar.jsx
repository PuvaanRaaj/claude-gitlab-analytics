const NAV = [
  {
    id: 'overview', label: 'Overview',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
        <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
        <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
        <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    id: 'commits', label: 'Commits',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
        <path d="M3 12h6M15 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'mrs', label: 'Merge Requests',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="2"/>
        <circle cx="6" cy="18" r="2" stroke="currentColor" strokeWidth="2"/>
        <circle cx="18" cy="8" r="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M6 8v8M6 8c0 4 12 4 12 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'issues', label: 'Issues',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'team', label: 'Team',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'pipelines', label: 'Pipelines',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

export default function Sidebar({ page, setPage, darkMode, onSettings, onToggleTheme, onSignOut, collapsed, onToggleCollapse, canViewTeam = true }) {
  const base = darkMode
    ? 'bg-obs-surface border-obs-border text-obs-muted'
    : 'bg-white border-slate-200 text-slate-500'

  const activeClass = darkMode
    ? 'bg-obs-cyan/10 text-obs-cyan border-r-2 border-obs-cyan'
    : 'bg-sky-50 text-sky-600 border-r-2 border-sky-500'

  const hoverClass = darkMode
    ? 'hover:bg-white/[0.04] hover:text-obs-text'
    : 'hover:bg-slate-50 hover:text-slate-700'

  return (
    <aside
      className={`${base} border-r flex flex-col flex-shrink-0 transition-all duration-300 z-20 ${
        collapsed ? 'w-14' : 'w-52'
      }`}
    >
      {/* Logo + collapse toggle */}
      <div className={`flex items-center h-14 border-b ${darkMode ? 'border-obs-border' : 'border-slate-200'} flex-shrink-0 ${collapsed ? 'justify-center px-0' : 'px-4 gap-3'}`}>
        {!collapsed && (
          <div className={`w-6 h-6 rounded-md ${darkMode ? 'bg-obs-cyan/10 border-obs-cyan/30' : 'bg-sky-100 border-sky-300'} border flex items-center justify-center flex-shrink-0`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke={darkMode ? '#00D4FF' : '#0284C7'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
        {!collapsed && (
          <span className={`font-sans font-bold text-sm tracking-wide flex-1 ${darkMode ? 'text-obs-text-bright' : 'text-slate-900'}`}>
            Observatory
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${
            darkMode ? 'hover:bg-white/[0.06] text-obs-muted hover:text-obs-text' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            {collapsed
              ? <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              : <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            }
          </svg>
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        {NAV.filter(item => item.id !== 'team' || canViewTeam).map(item => {
          const active = page === item.id
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center transition-colors ${
                collapsed ? 'justify-center px-0 h-10' : 'gap-3 px-4 h-10'
              } ${active ? activeClass : hoverClass}`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="font-sans text-xs font-medium truncate">{item.label}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className={`border-t ${darkMode ? 'border-obs-border' : 'border-slate-200'} py-2 flex-shrink-0`}>
        {[
          { title: 'Detection settings', onClick: onSettings, icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2"/>
            </svg>
          )},
          { title: darkMode ? 'Light mode' : 'Dark mode', onClick: onToggleTheme, icon: darkMode ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )},
          { title: 'Disconnect', onClick: onSignOut, danger: true, icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )},
        ].map(({ title, onClick, icon, danger }) => (
          <button
            key={title}
            onClick={onClick}
            title={title}
            className={`w-full flex items-center h-9 transition-colors ${collapsed ? 'justify-center' : 'gap-3 px-4'} ${
              danger
                ? darkMode ? 'hover:bg-red-500/10 hover:text-red-400' : 'hover:bg-red-50 hover:text-red-500'
                : hoverClass
            }`}
          >
            <span className="flex-shrink-0">{icon}</span>
            {!collapsed && <span className="font-sans text-xs font-medium">{title}</span>}
          </button>
        ))}
      </div>
    </aside>
  )
}
