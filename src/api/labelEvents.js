/**
 * Fetch GitLab resource_label_events for MRs and Issues.
 * Uses concurrency limiting + per-item caching to avoid hammering the API.
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

export async function fetchMRLabelEvents(projectId, mrIid) {
  const key = `flow:mr:${projectId}:${mrIid}`
  const cached = cacheGet(key)
  if (cached) return cached
  const data = await fetchAllPages(`/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/resource_label_events`)
  cacheSet(key, data, TTL_24H)
  return data
}

export async function fetchIssueLabelEvents(projectId, issueIid) {
  const key = `flow:issue:${projectId}:${issueIid}`
  const cached = cacheGet(key)
  if (cached) return cached
  const data = await fetchAllPages(`/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/resource_label_events`)
  cacheSet(key, data, TTL_24H)
  return data
}

/**
 * Batch-fetch label events for an array of MRs or Issues.
 * Each item must have `project_id` (or `_projectId`) and `iid`.
 * Returns an array of label event arrays, index-matched to `items`.
 */
export async function fetchFlowEventsForItems(items, type = 'mrs') {
  const fetcher = type === 'mrs' ? fetchMRLabelEvents : fetchIssueLabelEvents
  const tasks = items.map(item => () => fetcher(item.project_id, item.iid))
  return withConcurrency(tasks, 5)
}
