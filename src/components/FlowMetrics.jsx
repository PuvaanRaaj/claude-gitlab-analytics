/**
 * FlowMetrics — shows MR and Issue pipeline stage timing.
 *
 * Usage (Team):    <FlowMetrics mrFlows={...} issueFlows={...} loading={...} showTeamTable />
 * Usage (Member):  <FlowMetrics mrFlows={...} issueFlows={...} loading={...} memberUsername="foo" />
 */
import { useState } from 'react'
import { MR_STAGES, ISSUE_STAGES, avgMs, fmtDur, groupFlowsByUser } from '../utils/flowMetrics'

const STAGE_ALERT_MS = 3 * 24 * 60 * 60 * 1000  // 3 days
const STAGE_WARN_MS  = 1 * 24 * 60 * 60 * 1000  // 1 day

function stageColor(ms) {
  if (ms === null) return 'text-obs-muted/40'
  if (ms > STAGE_ALERT_MS) return 'text-red-400'
  if (ms > STAGE_WARN_MS)  return 'text-obs-amber'
  return 'text-green-400'
}

function StagePill({ ms }) {
  return (
    <span className={`font-mono text-[11px] font-medium tabular-nums ${stageColor(ms)}`}>
      {fmtDur(ms)}
    </span>
  )
}

/** Horizontal proportional stage bar for a single user/team */
function StageBar({ flows, stages }) {
  const avgs = stages.filter(s => s.key !== 'totalMs').map(s => ({
    ...s,
    val: avgMs(flows, s.key),
  }))
  const total = avgs.reduce((s, a) => s + (a.val || 0), 0)
  if (!total) return null
  return (
    <div className="flex h-2 rounded-full overflow-hidden gap-px mt-2">
      {avgs.map(({ key, color, val }) => val > 0 ? (
        <div
          key={key}
          title={`${stages.find(s => s.key === key)?.label}: ${fmtDur(val)}`}
          style={{ background: color, width: `${(val / total) * 100}%`, opacity: 0.8 }}
        />
      ) : null)}
    </div>
  )
}

function TeamAvgRow({ mrFlows, issueFlows }) {
  return (
    <tr className="border-t-2 border-obs-border bg-obs-card/40">
      <td className="px-4 py-2.5 font-mono text-[11px] text-obs-text-bright font-semibold">Team Avg</td>
      {MR_STAGES.map(s => (
        <td key={s.key} className="px-4 py-2.5 text-center">
          <StagePill ms={avgMs(mrFlows, s.key)} />
        </td>
      ))}
      <td className="px-4 py-2.5 text-center font-mono text-[11px] text-obs-muted">{mrFlows.length} MRs</td>
      {ISSUE_STAGES.map(s => (
        <td key={s.key} className="px-4 py-2.5 text-center">
          <StagePill ms={avgMs(issueFlows, s.key)} />
        </td>
      ))}
      <td className="px-4 py-2.5 text-center font-mono text-[11px] text-obs-muted">{issueFlows.length} issues</td>
    </tr>
  )
}

function UserFlowRow({ username, userMRFlows, userIssueFlows }) {
  const be = userMRFlows.filter(f => f.flowType === 'backend').length
  const sv = userMRFlows.filter(f => f.flowType === 'server').length
  return (
    <tr className="border-t border-obs-border/40 hover:bg-obs-card/30 transition-colors">
      <td className="px-4 py-2.5 font-mono text-xs text-obs-cyan">@{username}</td>
      {MR_STAGES.map(s => (
        <td key={s.key} className="px-4 py-2.5 text-center">
          <StagePill ms={avgMs(userMRFlows, s.key)} />
        </td>
      ))}
      <td className="px-4 py-2.5 text-center">
        <div className="font-mono text-[11px] text-obs-muted/60">{userMRFlows.length}</div>
        {(be > 0 || sv > 0) && (
          <div className="flex items-center justify-center gap-1 mt-0.5">
            {be > 0 && <span className="font-mono text-[9px] text-obs-cyan/60">{be}B</span>}
            {sv > 0 && <span className="font-mono text-[9px] text-purple-400/60">{sv}S</span>}
          </div>
        )}
      </td>
      {ISSUE_STAGES.map(s => (
        <td key={s.key} className="px-4 py-2.5 text-center">
          <StagePill ms={avgMs(userIssueFlows, s.key)} />
        </td>
      ))}
      <td className="px-4 py-2.5 text-center font-mono text-[11px] text-obs-muted/60">{userIssueFlows.length}</td>
    </tr>
  )
}

/** Drill-down panel shown when a stage card is clicked */
function StageDrillDown({ flows, stageKey, stageLabel, enterKey, isIssue }) {
  // Only include flows that have a non-null value for this stage
  const items = flows
    .filter(f => f[stageKey] !== null && f[stageKey] > 0)
    .sort((a, b) => b[stageKey] - a[stageKey])

  if (!items.length) return (
    <div className="mt-2 px-4 py-3 bg-obs-card/40 rounded-lg border border-obs-border/40">
      <p className="font-mono text-xs text-obs-muted">No data for this stage yet.</p>
    </div>
  )

  return (
    <div className="mt-2 rounded-lg border border-obs-border/60 overflow-hidden">
      <div className="px-4 py-2 bg-obs-card/50 border-b border-obs-border/40 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-obs-muted">
          {stageLabel} · {items.length} {isIssue ? 'issue' : 'MR'}{items.length !== 1 ? 's' : ''}
        </span>
        <span className="font-mono text-[10px] text-obs-muted">sorted by longest first</span>
      </div>
      <div className="divide-y divide-obs-border/30 max-h-64 overflow-y-auto">
        {items.map((f, i) => {
          const enterTs = f._enter?.[enterKey]
          const enterDate = enterTs ? new Date(enterTs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null
          const ms = f[stageKey]
          const iid = f.iid
          const webUrl = f.webUrl
          const title = f.title
          return (
            <div key={f.mrId || f.issueId || i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-obs-card/30 transition-colors">
              {/* Duration */}
              <span className={`flex-shrink-0 w-16 font-mono text-xs font-semibold text-right tabular-nums ${stageColor(ms)}`}>
                {fmtDur(ms)}
              </span>
              {/* Entered date */}
              <span className="flex-shrink-0 font-mono text-[10px] text-obs-muted w-28">
                {enterDate ? `from ${enterDate}` : ''}
              </span>
              {/* Open badge */}
              {f.isOpen && (
                <span className="flex-shrink-0 font-mono text-[9px] px-1 py-0.5 rounded border border-obs-amber/30 text-obs-amber bg-obs-amber/10">
                  open
                </span>
              )}
              {/* MR/Issue link */}
              <div className="flex-1 min-w-0">
                {webUrl ? (
                  <a href={webUrl} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-xs text-obs-text hover:text-obs-cyan transition-colors truncate block"
                    title={title}>
                    !{iid} {title}
                  </a>
                ) : (
                  <span className="font-mono text-xs text-obs-text truncate block">!{iid} {title}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Maps stageKey → the _enter key that stores the stage start timestamp
const STAGE_ENTER_KEY = {
  coderMs:        'coder',
  reviewMs:       'review',
  qcMs:           'qc',
  deployMs:       'deploy',
  totalMs:        'total',
  triageMs:       'triage',
  verificationMs: 'verification',
  approvalMs:     'approval',
  closeMs:        'close',
}

/** Compact single-user stage cards for MemberPage — clickable for drill-down */
function MemberStageCards({ flows, stages, title, count, accentColor, isIssue }) {
  const [activeStage, setActiveStage] = useState(null)
  const avgs = stages.map(s => ({ ...s, val: avgMs(flows, s.key) }))

  // Flow type breakdown (only for MR flows)
  const backendCount = flows.filter(f => f.flowType === 'backend').length
  const serverCount  = flows.filter(f => f.flowType === 'server').length
  const showTypeSplit = !isIssue && (backendCount > 0 || serverCount > 0) && (backendCount + serverCount === count)

  function handleCardClick(key) {
    setActiveStage(prev => prev === key ? null : key)
  }

  const activeStageInfo = activeStage ? stages.find(s => s.key === activeStage) : null

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: accentColor }}>
          {title} <span className="opacity-50">· {count} {count === 1 ? 'item' : 'items'}</span>
        </p>
        {showTypeSplit && (
          <div className="flex items-center gap-2">
            {backendCount > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-obs-cyan/20 bg-obs-cyan/10 text-obs-cyan">
                {backendCount} backend
              </span>
            )}
            {serverCount > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-purple-400/20 bg-purple-400/10 text-purple-400">
                {serverCount} server
              </span>
            )}
          </div>
        )}
        {activeStage && (
          <span className="font-mono text-[10px] text-obs-muted/60">click card again to close</span>
        )}
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {avgs.map(({ key, label, val }) => {
          const isActive = activeStage === key
          return (
            <button
              key={key}
              onClick={() => handleCardClick(key)}
              className={`bg-obs-card border rounded-lg px-3 py-2.5 text-center transition-all hover:border-obs-cyan/40 hover:bg-obs-card/80 cursor-pointer ${
                isActive ? 'border-obs-cyan/60 ring-1 ring-obs-cyan/20' : 'border-obs-border'
              }`}
            >
              <div className={`font-mono text-sm font-semibold ${stageColor(val)}`}>{fmtDur(val)}</div>
              <div className="font-mono text-[10px] text-obs-muted mt-0.5">{label}</div>
              {val !== null && (
                <div className="font-mono text-[9px] text-obs-muted/40 mt-1">click to expand</div>
              )}
            </button>
          )
        })}
      </div>
      <StageBar flows={flows} stages={stages} />
      {/* Drill-down panel */}
      {activeStage && activeStageInfo && (
        <StageDrillDown
          flows={flows}
          stageKey={activeStage}
          stageLabel={activeStageInfo.label}
          enterKey={STAGE_ENTER_KEY[activeStage] || activeStage}
          isIssue={!!isIssue}
        />
      )}
    </div>
  )
}

const STAGE_LABELS = {
  coder:          'Coder (coding)',
  review:         'Review (waiting for reviewer)',
  qc:             'QC (waiting for QC)',
  waiting_release:'Waiting for Release Queue',
  waiting_deploy: 'Waiting for Deployer',
  deploy:         'Deploy (waiting for deployment)',
}

function StuckBadge({ stuckMs }) {
  const days = stuckMs / (24 * 60 * 60 * 1000)
  if (days > 3) return <span className="font-mono text-[10px] text-red-400 font-semibold animate-pulse">● {fmtDur(stuckMs)}</span>
  if (days > 1) return <span className="font-mono text-[10px] text-obs-amber font-semibold">● {fmtDur(stuckMs)}</span>
  return <span className="font-mono text-[10px] text-green-400">● {fmtDur(stuckMs)}</span>
}

/** List of open MRs with current stuck stage */
function InProgressMRs({ mrFlows }) {
  const open = mrFlows
    .filter(f => f.isOpen && f.stuckMs > 0)
    .sort((a, b) => b.stuckMs - a.stuckMs)
  if (!open.length) return null

  return (
    <div className="bg-obs-surface border border-obs-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-obs-border bg-obs-card/30 flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-obs-amber animate-pulse" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-obs-amber">
          Currently In Progress — {open.length} open MR{open.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="divide-y divide-obs-border/40">
        {open.map(f => (
          <div key={f.mrId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-obs-card/30 transition-colors">
            {/* Stuck time */}
            <div className="w-20 flex-shrink-0 text-right">
              <StuckBadge stuckMs={f.stuckMs} />
            </div>
            {/* Stage */}
            <div className="w-44 flex-shrink-0">
              <span className="font-mono text-[10px] text-obs-muted">
                {STAGE_LABELS[f.currentStage] || f.currentStage}
              </span>
            </div>
            {/* Flow type badge */}
            <span className={`flex-shrink-0 font-mono text-[9px] px-1.5 py-0.5 rounded border ${
              f.flowType === 'backend'
                ? 'border-obs-cyan/20 bg-obs-cyan/10 text-obs-cyan'
                : 'border-purple-400/20 bg-purple-400/10 text-purple-400'
            }`}>
              {f.flowType === 'backend' ? 'B' : 'S'}
            </span>
            {/* Author */}
            <span className="font-mono text-[10px] text-obs-cyan flex-shrink-0">@{f.username}</span>
            {/* MR title */}
            <div className="flex-1 min-w-0">
              {f.webUrl ? (
                <a href={f.webUrl} target="_blank" rel="noopener noreferrer"
                  className="font-mono text-xs text-obs-text hover:text-obs-cyan transition-colors truncate block"
                  title={f.title}>
                  !{f.iid} {f.title}
                </a>
              ) : (
                <span className="font-mono text-xs text-obs-text truncate block">!{f.iid} {f.title}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Loading skeleton */
function FlowSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {[1,2,3].map(i => <div key={i} className="skeleton h-10 w-full rounded" />)}
    </div>
  )
}

export default function FlowMetrics({
  mrFlows = [],
  issueFlows = [],
  loading = false,
  showTeamTable = false,   // show per-user breakdown table
  memberUsername = null,   // if set, filter to this user in member view
}) {
  if (loading) return <FlowSkeleton />

  // Member view
  if (memberUsername !== null) {
    const myMRFlows    = mrFlows.filter(f => f.username === memberUsername)
    const myIssueFlows = issueFlows.filter(f => f.username === memberUsername)
    if (!myMRFlows.length && !myIssueFlows.length) {
      return (
        <p className="font-mono text-xs text-obs-muted py-4">
          No DO:: label events found — labels may not have been applied or fetched yet.
        </p>
      )
    }
    return (
      <div className="space-y-4">
        {myMRFlows.length > 0 && (
          <MemberStageCards
            flows={myMRFlows}
            stages={MR_STAGES}
            title="MR Flow"
            count={myMRFlows.length}
            accentColor="#00C9FF"
          />
        )}
        {myIssueFlows.length > 0 && (
          <MemberStageCards
            flows={myIssueFlows}
            stages={ISSUE_STAGES}
            title="Issue Flow"
            count={myIssueFlows.length}
            accentColor="#A78BFA"
            isIssue
          />
        )}
      </div>
    )
  }

  // Team table view
  const perUser = groupFlowsByUser(mrFlows, issueFlows)
  const completedMRFlows = mrFlows.filter(f => !f.isOpen)
  const hasData = completedMRFlows.length > 0 || issueFlows.length > 0

  if (!hasData && !mrFlows.some(f => f.isOpen)) {
    return (
      <p className="font-mono text-xs text-obs-muted py-4">
        No MRs / issues with DO:: labels found in the selected time range.
      </p>
    )
  }

  const thCls = 'px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-obs-muted text-center whitespace-nowrap'
  const thNameCls = 'px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-obs-muted text-left'

  return (
    <div className="space-y-5">
      {/* Currently in-progress MRs — always shown first */}
      <InProgressMRs mrFlows={mrFlows} />

      {!hasData && (
        <p className="font-mono text-xs text-obs-muted">
          No completed MRs / issues with DO:: labels yet — averages will appear as data is merged.
        </p>
      )}

      {hasData && <>
      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="font-mono text-[10px] text-green-400">● &lt; 1d  OK</span>
        <span className="font-mono text-[10px] text-obs-amber">● 1–3d  slow</span>
        <span className="font-mono text-[10px] text-red-400">● &gt; 3d  blocked</span>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto rounded-xl border border-obs-border">
        <table className="w-full border-collapse">
          <thead className="bg-obs-card/50 border-b border-obs-border">
            <tr>
              <th className={thNameCls} rowSpan={2}>Member</th>
              <th colSpan={MR_STAGES.length + 1} className="px-4 pt-2.5 pb-1 font-mono text-[10px] uppercase tracking-widest text-obs-cyan text-center border-b border-obs-border/30">
                MR Flow
              </th>
              <th colSpan={ISSUE_STAGES.length + 1} className="px-4 pt-2.5 pb-1 font-mono text-[10px] uppercase tracking-widest text-purple-400 text-center border-b border-obs-border/30">
                Issue Flow
              </th>
            </tr>
            <tr className="bg-obs-card/30">
              {MR_STAGES.map(s => <th key={s.key} className={thCls}>{s.label}</th>)}
              <th className={thCls}>#</th>
              {ISSUE_STAGES.map(s => <th key={s.key} className={thCls}>{s.label}</th>)}
              <th className={thCls}>#</th>
            </tr>
          </thead>
          <tbody>
            {[...perUser.entries()]
              .sort((a, b) => (b[1].mrFlows.length + b[1].issueFlows.length) - (a[1].mrFlows.length + a[1].issueFlows.length))
              .map(([username, { mrFlows: uMR, issueFlows: uIssue }]) => (
                <UserFlowRow key={username} username={username} userMRFlows={uMR} userIssueFlows={uIssue} />
              ))
            }
            <TeamAvgRow mrFlows={mrFlows} issueFlows={issueFlows} />
          </tbody>
        </table>
      </div>

      {/* Stage bars for team */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {mrFlows.length > 0 && (
          <div className="bg-obs-surface border border-obs-border rounded-xl p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-obs-cyan mb-3">MR Stage Breakdown (Team Avg)</p>
            <div className="space-y-2">
              {MR_STAGES.filter(s => s.key !== 'totalMs').map(s => {
                const val = avgMs(mrFlows, s.key)
                const totalVal = avgMs(mrFlows, 'totalMs')
                const pct = (val && totalVal) ? Math.round((val / totalVal) * 100) : 0
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono text-[10px] text-obs-muted">{s.label}</span>
                      <span className={`font-mono text-[11px] ${stageColor(val)}`}>{fmtDur(val)}</span>
                    </div>
                    <div className="h-1.5 bg-obs-card rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.color, opacity: 0.8 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {issueFlows.length > 0 && (
          <div className="bg-obs-surface border border-obs-border rounded-xl p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-purple-400 mb-3">Issue Stage Breakdown (Team Avg)</p>
            <div className="space-y-2">
              {ISSUE_STAGES.filter(s => s.key !== 'totalMs').map(s => {
                const val = avgMs(issueFlows, s.key)
                const totalVal = avgMs(issueFlows, 'totalMs')
                const pct = (val && totalVal) ? Math.round((val / totalVal) * 100) : 0
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono text-[10px] text-obs-muted">{s.label}</span>
                      <span className={`font-mono text-[11px] ${stageColor(val)}`}>{fmtDur(val)}</span>
                    </div>
                    <div className="h-1.5 bg-obs-card rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.color, opacity: 0.8 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      </>}
    </div>
  )
}
