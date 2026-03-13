/**
 * Fetch label change history for MRs and Issues.
 *
 * Sources (merged together for maximum coverage):
 *   1. resource_label_events — structured GitLab API (most reliable when available)
 *   2. System notes (/notes?system=true) — activity feed, captures events missed
 *      by older GitLab versions or edge cases
 *
 * Normalised output: [{ action: 'add'|'remove', label: { name }, created_at }]
 */
import { cacheGet, cacheSet, TTL_24H } from '../utils/cache'

function getConfig() {
  const token   = localStorage.getItem('gl_token')   || import.meta.env.VITE_GITLAB_TOKEN || ''
  const baseUrl = localStorage.getItem('gl_url')     || import.meta.env.VITE_GITLAB_URL   || 'https://gitlab.com'
  return { token, baseUrl: baseUrl.replace(/\/$/, '') }
}

async function fetchAllPages(path) {
  const { token, baseUrl } = getConfig()
  if (!token) return []
  const results = []
  let page = 1
  while (page <= 10) {
    const url = new URL(`${baseUrl}/api/v4${path}`)
    url.searchParams.set('page', page)
    url.searchParams.set('per_page', 100)
    const resp = await fetch(url.toString(), { headers: { 'PRIVATE-TOKEN': token } })
    if (!resp.ok) return results
    const data = await resp.json()
    if (!Array.isArray(data)) return results
    results.push(...data)
    const next = resp.headers.get('X-Next-Page')
    if (!next) break
    page = parseInt(next, 10)
  }
  return results
}

/** Run up to `limit` promises concurrently */
async function withConcurrency(tasks, limit = 5) {
  const results = new Array(tasks.length)
  let idx = 0
  async function run() {
    while (idx < tasks.length) {
      const i = idx++
      results[i] = await tasks[i]().catch(() => [])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, run))
  return results
}

/**
 * Parse system note body text into label events.
 * GitLab system notes look like:
 *   added ~"DO::Ready For Review" label
 *   removed ~"DO::Deploy UAT" label and added ~"DO::Checked" label
 *   added ~'DO::Approved' label
 *   added ~DO::Doing label   (no quotes for single-word labels)
 */
function parseSystemNote(noteBody = '', createdAt) {
  const events = []
  // Match pairs of (added|removed) followed by ~"name" or ~'name'
  // Using two separate regexes to avoid capturing group conflicts
  const patternDQ = /(added|removed)\s+~"([^"]+)"/g
  const patternSQ = /(added|removed)\s+~'([^']+)'/g
  const patternNQ = /(added|removed)\s+~([A-Za-z][^\s,]*)/g

  function push(action, name) {
    events.push({
      action: action === 'removed' ? 'remove' : 'add',
      label: { name },
      created_at: createdAt,
    })
  }

  let m
  const seen = new Set()
  for (const [pat, grp] of [[patternDQ, 2], [patternSQ, 2], [patternNQ, 2]]) {
    while ((m = pat.exec(noteBody)) !== null) {
      const name = m[grp]
      const k = `${m[1]}:${name.toLowerCase()}`
      if (!seen.has(k)) { push(m[1], name); seen.add(k) }
    }
  }
  return events
}

/**
 * Parse all system notes into normalised label event objects
 */
function notesToLabelEvents(notes) {
  const events = []
  for (const note of notes) {
    if (!note.system) continue
    const parsed = parseSystemNote(note.body, note.created_at)
    events.push(...parsed)
  }
  return events
}

/**
 * Merge resource_label_events + note-derived events, deduplicate by label+action+minute
 */
function mergeEvents(structuredEvents, noteEvents) {
  const key = (e) => {
    const t = new Date(e.created_at)
    // Round to nearest minute to deduplicate
    const roundedMin = Math.floor(t.getTime() / 60000) * 60000
    return `${e.action}:${(e.label?.name || '').toLowerCase()}:${roundedMin}`
  }
  const seen = new Set(structuredEvents.map(key))
  const merged = [...structuredEvents]
  for (const e of noteEvents) {
    if (!seen.has(key(e))) {
      merged.push(e)
      seen.add(key(e))
    }
  }
  return merged.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

async function fetchAndMergeLabelEvents(structuredPath, notesPath) {
  const [structured, notes] = await Promise.all([
    fetchAllPages(structuredPath).catch(() => []),
    fetchAllPages(notesPath).catch(() => []),
  ])
  const noteEvents = notesToLabelEvents(notes)
  return mergeEvents(structured, noteEvents)
}

export async function fetchMRLabelEvents(projectId, mrIid) {
  const key = `flow:mr:v2:${projectId}:${mrIid}`
  const cached = cacheGet(key)
  if (cached) return cached
  const data = await fetchAndMergeLabelEvents(
    `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/resource_label_events`,
    `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/notes?system=true`
  )
  cacheSet(key, data, TTL_24H)
  return data
}

export async function fetchIssueLabelEvents(projectId, issueIid) {
  const key = `flow:issue:v2:${projectId}:${issueIid}`
  const cached = cacheGet(key)
  if (cached) return cached
  const data = await fetchAndMergeLabelEvents(
    `/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/resource_label_events`,
    `/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/notes?system=true`
  )
  cacheSet(key, data, TTL_24H)
  return data
}

/**
 * Batch-fetch label events for an array of MRs or Issues.
 * Each item must have `project_id` and `iid`.
 */
export async function fetchFlowEventsForItems(items, type = 'mrs') {
  const fetcher = type === 'mrs' ? fetchMRLabelEvents : fetchIssueLabelEvents
  const tasks = items.map(item => () => fetcher(item.project_id, item.iid))
  return withConcurrency(tasks, 4)
}
