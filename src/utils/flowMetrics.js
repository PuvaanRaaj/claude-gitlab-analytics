/**
 * Flow metrics computation from merged label events (resource_label_events + system notes).
 *
 * Auto-detects flow type per MR (a coder may work on both repos):
 *
 * Backend MR (has DO::Deploy UAT):
 *   Coder   → created_at → DO::Ready For Review
 *   Review  → DO::Ready For Review → DO::Deploy UAT
 *   QC      → DO::Deploy UAT → DO::Checked
 *   Deploy  → DO::Release Queue → merged_at
 *
 * Server MR (no DO::Deploy UAT, has DO::Ready For Merge):
 *   Coder   → created_at → DO::Ready For Review
 *   Review  → DO::Ready For Review → DO::Ready For Merge
 *   QC      → null (no QC stage in server flow)
 *   Deploy  → DO::Release Queue → merged_at
 *
 * Issue Flow (shared):
 *   Triage       → created_at  to  DO::Request for Verification
 *   Verification → DO::Request for Verification  to  DO::Verified
 *   Approval     → DO::Request for Approval  to  DO::Approved
 *   Close        → DO::Approved  to  closed_at
 *   Total        → created_at  to  closed_at
 */

export const MR_STAGES = [
  { key: 'coderMs',  label: 'Coder',  color: '#00C9FF' },
  { key: 'reviewMs', label: 'Review', color: '#A78BFA' },
  { key: 'qcMs',     label: 'QC',     color: '#F4A024' },
  { key: 'deployMs', label: 'Deploy', color: '#22C55E' },
  { key: 'totalMs',  label: 'Total',  color: '#94A3B8' },
]

export const ISSUE_STAGES = [
  { key: 'triageMs',       label: 'Triage',       color: '#00C9FF' },
  { key: 'verificationMs', label: 'Verification', color: '#A78BFA' },
  { key: 'approvalMs',     label: 'Approval',     color: '#F4A024' },
  { key: 'closeMs',        label: 'Close',        color: '#22C55E' },
  { key: 'totalMs',        label: 'Total',        color: '#94A3B8' },
]

/**
 * Return the earliest timestamp (ms) when a label was added.
 * Case-insensitive match against label.name or the raw label string.
 */
function firstAddedAt(events, labelName) {
  const lc = labelName.toLowerCase().trim()
  const matches = events
    .filter(e => {
      if (e.action !== 'add') return false
      const n = (e.label?.name || e.label || '').toLowerCase().trim()
      return n === lc
    })
    .map(e => new Date(e.created_at).getTime())
    .filter(t => !isNaN(t))
  return matches.length > 0 ? Math.min(...matches) : null
}

export function computeMRFlow(mr, labelEvents = []) {
  const created = new Date(mr.created_at).getTime()
  const merged  = mr.merged_at ? new Date(mr.merged_at).getTime() : null
  const isOpen  = mr.state === 'opened'
  const now     = Date.now()

  const readyForReview = firstAddedAt(labelEvents, 'DO::Ready For Review')
  const deployUAT      = firstAddedAt(labelEvents, 'DO::Deploy UAT')
  const checked        = firstAddedAt(labelEvents, 'DO::Checked')
  const readyForMerge  = firstAddedAt(labelEvents, 'DO::Ready For Merge')
                      || firstAddedAt(labelEvents, 'DO::Read For Merge') // typo variant
  const releaseQueue   = firstAddedAt(labelEvents, 'DO::Release Queue')

  // Auto-detect flow type
  const isBackend = !!deployUAT
  const reviewEnd = isBackend ? deployUAT : readyForMerge

  // For open MRs: determine which stage they're currently stuck at
  // and how long they've been there
  let currentStage = null
  let stuckMs      = null
  if (isOpen) {
    if (releaseQueue) {
      currentStage = 'deploy'
      stuckMs      = now - releaseQueue
    } else if (isBackend && checked) {
      currentStage = 'waiting_release'
      stuckMs      = now - checked
    } else if (isBackend && deployUAT) {
      currentStage = 'qc'
      stuckMs      = now - deployUAT
    } else if (!isBackend && readyForMerge) {
      currentStage = 'waiting_deploy'
      stuckMs      = now - readyForMerge
    } else if (readyForReview) {
      currentStage = 'review'
      stuckMs      = now - readyForReview
    } else {
      currentStage = 'coder'
      stuckMs      = now - created
    }
  }

  return {
    mrId:         mr.id,
    iid:          mr.iid,
    title:        mr.title,
    webUrl:       mr.web_url,
    username:     mr.author?.username,
    flowType:     isBackend ? 'backend' : readyForMerge ? 'server' : 'unknown',
    isOpen,
    currentStage,
    stuckMs,
    coderMs:      readyForReview ? readyForReview - created                    : null,
    reviewMs:     (readyForReview && reviewEnd) ? reviewEnd - readyForReview   : null,
    qcMs:         (isBackend && deployUAT && checked) ? checked - deployUAT   : null,
    deployMs:     (releaseQueue && merged) ? merged - releaseQueue             : null,
    totalMs:      merged ? merged - created : null,
  }
}

export function computeIssueFlow(issue, labelEvents = []) {
  const created = new Date(issue.created_at).getTime()
  const closed  = issue.closed_at ? new Date(issue.closed_at).getTime() : null

  const requestVerif  = firstAddedAt(labelEvents, 'DO::Request for Verification')
  const verified      = firstAddedAt(labelEvents, 'DO::Verified')
  const requestApprov = firstAddedAt(labelEvents, 'DO::Request for Approval')
  const approved      = firstAddedAt(labelEvents, 'DO::Approved')

  return {
    issueId:        issue.id,
    iid:            issue.iid,
    title:          issue.title,
    username:       issue.author?.username,
    triageMs:       requestVerif  ? requestVerif - created               : null,
    verificationMs: (requestVerif && verified) ? verified - requestVerif  : null,
    approvalMs:     (requestApprov && approved) ? approved - requestApprov : null,
    closeMs:        (approved && closed) ? closed - approved              : null,
    totalMs:        closed ? closed - created : null,
  }
}

/** Average a metric across an array of flow results, ignoring nulls */
export function avgMs(flowArray, key) {
  const vals = flowArray.map(f => f[key]).filter(v => v !== null && v > 0)
  if (!vals.length) return null
  return vals.reduce((s, v) => s + v, 0) / vals.length
}

/** Format milliseconds → "Xd Yh" / "Xh Ym" / "Xm" */
export function fmtDur(ms) {
  if (ms === null || ms === undefined || isNaN(ms) || ms <= 0) return '—'
  const totalMinutes = Math.floor(ms / 60000)
  const totalHours   = Math.floor(totalMinutes / 60)
  const days         = Math.floor(totalHours / 24)
  const hours        = totalHours % 24
  const minutes      = totalMinutes % 60
  if (days > 0)       return `${days}d ${hours}h`
  if (totalHours > 0) return `${totalHours}h ${minutes}m`
  return `${minutes}m`
}

/**
 * Group flow results by username for per-user table rows.
 * Returns Map<username, { mrFlows, issueFlows }>
 */
export function groupFlowsByUser(mrFlows, issueFlows) {
  const map = new Map()
  function ensure(u) {
    if (!map.has(u)) map.set(u, { mrFlows: [], issueFlows: [] })
    return map.get(u)
  }
  mrFlows.forEach(f => { if (f.username) ensure(f.username).mrFlows.push(f) })
  issueFlows.forEach(f => { if (f.username) ensure(f.username).issueFlows.push(f) })
  return map
}
