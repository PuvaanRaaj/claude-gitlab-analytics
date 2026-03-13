import { useState, useEffect } from 'react'
import { DEFAULT_THRESHOLDS } from './utils/detection'
import { reviewDurationHours } from './utils/dateHelpers'
import { fetchProjects, fetchCurrentUser, fetchGroupMembers } from './api/gitlab'
import { cacheGet, cacheSet, cacheClear, TTL_1H, TTL_24H } from './utils/cache'
import { useGitLabData } from './hooks/useGitLabData'
import { useClaudeDetection } from './hooks/useClaudeDetection'

import Onboarding      from './components/Onboarding'
import Sidebar         from './components/Sidebar'
import SettingsDrawer  from './components/SettingsDrawer'
import ProjectSelector from './components/ProjectSelector'

import OverviewPage   from './pages/OverviewPage'
import CommitsPage    from './pages/CommitsPage'
import MRsPage        from './pages/MRsPage'
import IssuesPage     from './pages/IssuesPage'
import TeamPage       from './pages/TeamPage'
import PipelinesPage  from './pages/PipelinesPage'

const TIME_RANGES = [
  { label: '7d',  value: '7d'  },
  { label: '14d', value: '14d' },
  { label: '30d', value: '30d' },
  { label: 'Custom', value: 'custom' },
]

function hasCredentials() {
  return !!(
    localStorage.getItem('gl_token') ||
    (import.meta.env.VITE_GITLAB_TOKEN && import.meta.env.VITE_GITLAB_TOKEN !== 'your_personal_access_token_here')
  )
}

/**
 * Returns the list of GitLab usernames allowed to view the Team page.
 * Empty array = no restriction (everyone can see it).
 * Priority: localStorage > VITE_TEAM_ALLOWED_USERS env var
 */
export function getTeamAllowedUsers() {
  const stored = localStorage.getItem('team_allowed_users')
  if (stored !== null) {
    return stored.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  }
  const env = import.meta.env.VITE_TEAM_ALLOWED_USERS || ''
  return env.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
}

export function setTeamAllowedUsers(usernames) {
  localStorage.setItem('team_allowed_users', usernames.join(','))
}

export default function App() {
  const [authed, setAuthed]             = useState(hasCredentials)
  const [darkMode, setDarkMode]         = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [thresholds, setThresholds]     = useState(DEFAULT_THRESHOLDS)
  const [page, setPage]                 = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [timeRange, setTimeRange]       = useState('30d')
  const [customRange, setCustomRange]   = useState({ from: '', to: '' })
  const [showCustom, setShowCustom]     = useState(false)
  const [projects, setProjects]         = useState([])
  const [selectedIds, setSelectedIds]   = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [currentUser, setCurrentUser]   = useState(null)
  const [teamAllowedUsers, setTeamAllowedUsersState] = useState(getTeamAllowedUsers)
  // Maps normalised display name → GitLab username
  const [memberUsernameMap, setMemberUsernameMap] = useState(new Map())

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    document.documentElement.classList.toggle('light', !darkMode)
  }, [darkMode])

  useEffect(() => {
    if (!authed) return
    const cached = cacheGet('current_user')
    if (cached) { setCurrentUser(cached); return }
    fetchCurrentUser().then(u => {
      setCurrentUser(u)
      cacheSet('current_user', u, TTL_24H)
    }).catch(() => {})
  }, [authed])

  useEffect(() => {
    if (!authed) return
    const cached = cacheGet('projects')
    if (cached) {
      setProjects(cached)
      const defaultIds = cached
        .filter(p => {
          const ns = p.path_with_namespace?.toLowerCase() || ''
          return ns.startsWith('backend/') || ns.startsWith('server/')
        })
        .map(p => p.id)
      setSelectedIds(defaultIds.length > 0 ? defaultIds : cached.slice(0, 3).map(p => p.id))
      return
    }
    setProjectsLoading(true)
    fetchProjects()
      .then(ps => {
        setProjects(ps)
        cacheSet('projects', ps, TTL_1H)
        const defaultIds = ps
          .filter(p => {
            const ns = p.path_with_namespace?.toLowerCase() || ''
            return ns.startsWith('backend/') || ns.startsWith('server/')
          })
          .map(p => p.id)
        setSelectedIds(defaultIds.length > 0 ? defaultIds : ps.slice(0, 3).map(p => p.id))
      })
      .catch(console.error)
      .finally(() => setProjectsLoading(false))
  }, [authed])

  // Fetch group members to build name → username map for Team breakdown
  useEffect(() => {
    if (!authed || !projects.length || !selectedIds.length) return
    const norm = s => (s || '').replace(/[\s._-]+/g, '').toLowerCase()
    const groupIds = [...new Set(
      projects
        .filter(p => selectedIds.includes(p.id) && p.namespace?.kind === 'group')
        .map(p => p.namespace.id)
    )]
    if (!groupIds.length) return
    const cacheKey = `members:${groupIds.sort().join(',')}`
    const cached = cacheGet(cacheKey)
    if (cached) {
      const map = new Map(cached)
      setMemberUsernameMap(map)
      return
    }
    Promise.all(groupIds.map(fetchGroupMembers)).then(results => {
      const map = new Map()
      results.flat().forEach(m => {
        if (m.username && m.name) {
          map.set(norm(m.name), m.username)
          map.set(norm(m.username), m.username)
        }
      })
      setMemberUsernameMap(map)
      cacheSet(cacheKey, [...map.entries()], TTL_24H)
    })
  }, [authed, selectedIds.join(','), projects.length])

  const { commits, mrs, issues, pipelines, loading, error, retry, since, until } =
    useGitLabData(selectedIds, timeRange, customRange)

  const {
    taggedCommits, taggedMRs, taggedIssues,
    claudeCommitIds, claudeCommits, manualCommits,
    claudeMRs, claudeIssues,
    usageBreakdown, toolBreakdown,
    avgFilesChanged, claudeLines, manualLines,
  } = useClaudeDetection(commits, mrs, issues, thresholds)

  // Derived metrics
  const mergedMRs = mrs.filter(m => m.state === 'merged')
  const avgReviewHours = mergedMRs.length > 0
    ? Math.round(mergedMRs.reduce((s, m) => s + (reviewDurationHours(m) || 0), 0) / mergedMRs.length)
    : 0

  const aiMergedDescs = claudeMRs.filter(t => t.mr.state === 'merged').map(t => t.mr.description || '')
  const aiClosedNums  = new Set(
    aiMergedDescs.flatMap(d => [...d.matchAll(/(?:closes?|fixes?|resolves?)\s+#(\d+)/gi)].map(m => parseInt(m[1], 10)))
  )
  const aiClosedIds = new Set(claudeIssues.filter(t => t.issue.state === 'closed').map(t => t.issue.iid))
  const closedIssues = issues.filter(i => i.state === 'closed' && (aiClosedNums.has(i.iid) || aiClosedIds.has(i.iid))).length

  function handleRangeClick(val) {
    if (val === 'custom') { setShowCustom(true) }
    else { setShowCustom(false); setTimeRange(val) }
  }

  function applyCustomRange() {
    if (customRange.from && customRange.to) { setTimeRange('custom'); setShowCustom(false) }
  }

  function handleSetTeamAllowedUsers(usernames) {
    setTeamAllowedUsers(usernames)
    setTeamAllowedUsersState(usernames)
  }

  // Team page access: empty list = everyone allowed; non-empty = only listed usernames
  const canViewTeam = teamAllowedUsers.length === 0 ||
    (currentUser && teamAllowedUsers.includes(currentUser.username?.toLowerCase()))

  function handleSignOut() {
    localStorage.removeItem('gl_token')
    localStorage.removeItem('gl_url')
    cacheClear()
    setAuthed(false)
  }

  if (!authed) return <Onboarding onComplete={() => setAuthed(true)} />

  // Filter tagged commits to the current user (for Overview personal metrics)
  function isMyCommit(commit) {
    if (!currentUser) return true // fallback: show all if user not loaded yet
    const normName = s => (s || '').replace(/[\s._-]+/g, '').toLowerCase()
    return (
      (commit.author_email && currentUser.email && commit.author_email === currentUser.email) ||
      normName(commit.author_name) === normName(currentUser.name)
    )
  }
  const myTaggedCommits   = taggedCommits.filter(t => isMyCommit(t.commit))
  const myClaudeCommits   = myTaggedCommits.filter(t => t.isClaudeAssisted)
  const myManualCommits   = myTaggedCommits.filter(t => !t.isClaudeAssisted)
  const myClaudeCommitIds = new Set(myClaudeCommits.map(t => t.commit.id))
  const myCommits         = myTaggedCommits.map(t => t.commit)

  // Personal line counts — used by Overview (not team-wide)
  const myClaudeLines = myClaudeCommits.reduce((s, t) => ({
    additions: s.additions + (t.commit.stats?.additions ?? 0),
    deletions: s.deletions + (t.commit.stats?.deletions ?? 0),
  }), { additions: 0, deletions: 0 })

  const myManualLines = myManualCommits.reduce((s, t) => ({
    additions: s.additions + (t.commit.stats?.additions ?? 0),
    deletions: s.deletions + (t.commit.stats?.deletions ?? 0),
  }), { additions: 0, deletions: 0 })

  // Shared props passed to every page
  const sharedProps = {
    loading, error, retry, since, until,
    commits, mrs, issues, pipelines,
    taggedCommits, taggedMRs, taggedIssues,
    claudeCommitIds, claudeCommits, manualCommits,
    claudeMRs, claudeIssues,
    usageBreakdown, toolBreakdown,
    avgFilesChanged, claudeLines, manualLines,
    mergedMRs, closedIssues,
    totalIssues: issues.length, totalMRs: mrs.length,
    avgReviewHours,
    projects,
    currentUser,
    memberUsernameMap,
    // Personal (my) commit data — used by OverviewPage
    myCommits, myTaggedCommits, myClaudeCommits, myClaudeCommitIds,
    myClaudeLines, myManualLines,
  }

  const PAGE_TITLES = {
    overview: 'Overview', commits: 'Commits', mrs: 'Merge Requests',
    issues: 'Issues', team: 'Team', pipelines: 'Pipelines',
  }

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'bg-obs-bg' : 'bg-[#F8F9FC]'}`}>
      {/* Background grid */}
      {darkMode && <div className="fixed inset-0 bg-grid-dark bg-grid-sm pointer-events-none z-0" />}

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        thresholds={thresholds}
        setThresholds={setThresholds}
        teamAllowedUsers={teamAllowedUsers}
        onSetTeamAllowedUsers={handleSetTeamAllowedUsers}
      />

      {/* Sidebar */}
      <Sidebar
        page={page}
        setPage={setPage}
        darkMode={darkMode}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        onSettings={() => setSettingsOpen(true)}
        onToggleTheme={() => setDarkMode(d => !d)}
        onSignOut={handleSignOut}
        canViewTeam={canViewTeam}
      />

      {/* Main column */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Header ── */}
        <header className={`flex-shrink-0 z-20 sticky top-0 border-b backdrop-blur-md ${darkMode ? 'border-obs-border bg-obs-bg/80' : 'border-slate-200 bg-white/80'}`}>
          <div className="h-14 px-5 flex items-center gap-4">
            {/* Page title */}
            <h1 className={`font-sans font-bold text-sm tracking-wide flex-shrink-0 ${darkMode ? 'text-obs-text-bright' : 'text-slate-900'}`}>
              {PAGE_TITLES[page]}
            </h1>

            <div className="flex-1" />

            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <ProjectSelector projects={projects} selectedIds={selectedIds} onChange={setSelectedIds} loading={projectsLoading} />

              <div className={`flex items-center gap-0.5 border rounded-lg p-0.5 ${darkMode ? 'bg-obs-surface border-obs-border' : 'bg-slate-100 border-slate-200'}`}>
                {TIME_RANGES.map(r => (
                  <button
                    key={r.value}
                    onClick={() => handleRangeClick(r.value)}
                    className={`px-3 py-1.5 rounded-md font-mono text-xs transition-all ${
                      (timeRange === r.value && r.value !== 'custom') || (r.value === 'custom' && showCustom)
                        ? darkMode ? 'bg-obs-card text-obs-cyan border border-obs-cyan/30' : 'bg-white text-sky-600 border border-sky-300 shadow-sm'
                        : darkMode ? 'text-obs-muted hover:text-obs-text' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom date bar */}
          {showCustom && (
            <div className={`border-t px-5 py-3 flex items-center gap-3 ${darkMode ? 'bg-obs-surface border-obs-border' : 'bg-slate-50 border-slate-200'}`}>
              <span className="font-mono text-xs text-obs-muted">From</span>
              <input type="date" value={customRange.from} onChange={e => setCustomRange(r => ({ ...r, from: e.target.value }))}
                className={`h-8 px-3 rounded-lg border font-mono text-xs focus:outline-none focus:border-obs-cyan transition-colors ${darkMode ? 'bg-obs-card border-obs-border text-obs-text' : 'bg-white border-slate-200 text-slate-700'}`} />
              <span className="font-mono text-xs text-obs-muted">To</span>
              <input type="date" value={customRange.to} onChange={e => setCustomRange(r => ({ ...r, to: e.target.value }))}
                className={`h-8 px-3 rounded-lg border font-mono text-xs focus:outline-none focus:border-obs-cyan transition-colors ${darkMode ? 'bg-obs-card border-obs-border text-obs-text' : 'bg-white border-slate-200 text-slate-700'}`} />
              <button onClick={applyCustomRange} className="h-8 px-4 bg-obs-cyan text-obs-bg rounded-lg font-mono text-xs font-semibold hover:bg-obs-cyan-dim transition-colors">Apply</button>
              <button onClick={() => setShowCustom(false)} className="font-mono text-xs text-obs-muted hover:text-obs-text">Cancel</button>
            </div>
          )}
        </header>

        {/* ── Scrollable page content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-5">
            {/* Error banner */}
            {error && (
              <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-400 flex-shrink-0">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="font-mono text-sm text-red-400">{error}</span>
                </div>
                <button onClick={retry} className="font-mono text-xs text-red-400 border border-red-500/30 rounded-lg px-3 py-1.5 hover:bg-red-500/10 transition-colors">Retry</button>
              </div>
            )}

            {/* Page routing */}
            {page === 'overview'   && <OverviewPage  {...sharedProps} />}
            {page === 'commits'    && <CommitsPage   {...sharedProps} />}
            {page === 'mrs'        && <MRsPage       {...sharedProps} />}
            {page === 'issues'     && <IssuesPage    {...sharedProps} />}
            {page === 'team'       && (canViewTeam ? <TeamPage {...sharedProps} /> : (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-obs-border2">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p className="font-mono text-sm text-obs-muted">You don't have access to the Team view.</p>
              </div>
            ))}
            {page === 'pipelines'  && <PipelinesPage {...sharedProps} />}

            {/* Footer */}
            <div className="pt-6 pb-2 flex items-center justify-between">
              <span className="font-mono text-xs text-obs-muted/40">AI Observatory · GitLab REST API</span>
              {!loading && (
                <button onClick={retry} className="font-mono text-xs text-obs-muted hover:text-obs-text transition-colors flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12a9 9 0 1018 0 9 9 0 00-9-9M3 12V6M3 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Refresh
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
