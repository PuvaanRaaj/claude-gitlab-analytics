/**
 * GitLab REST API client
 * Uses personal access token from localStorage (set via Onboarding) or .env fallback
 */

function getConfig() {
  const token = localStorage.getItem('gl_token') || import.meta.env.VITE_GITLAB_TOKEN || ''
  const baseUrl = localStorage.getItem('gl_url') || import.meta.env.VITE_GITLAB_URL || 'https://gitlab.com'
  return { token, baseUrl: baseUrl.replace(/\/$/, '') }
}

async function gitlabFetch(path, params = {}) {
  const { token, baseUrl } = getConfig()
  if (!token) throw new Error('NO_TOKEN')

  const url = new URL(`${baseUrl}/api/v4${path}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v)
  })

  const resp = await fetch(url.toString(), {
    headers: {
      'PRIVATE-TOKEN': token,
      'Content-Type': 'application/json',
    },
  })

  if (!resp.ok) {
    if (resp.status === 401) throw new Error('UNAUTHORIZED')
    if (resp.status === 404) throw new Error('NOT_FOUND')
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
  }

  const data = await resp.json()
  const nextPage = resp.headers.get('X-Next-Page')
  return { data, nextPage }
}

/**
 * Paginate through all pages of a GitLab endpoint
 */
async function paginateAll(path, params = {}, maxPages = 20) {
  const results = []
  let page = 1

  while (page <= maxPages) {
    const { data, nextPage } = await gitlabFetch(path, { ...params, page, per_page: 100 })
    results.push(...data)
    if (!nextPage) break
    page = parseInt(nextPage, 10)
  }

  return results
}

/**
 * Fetch all projects the user has access to
 */
export async function fetchProjects() {
  return paginateAll('/projects', {
    membership: true,
    order_by: 'last_activity_at',
    sort: 'desc',
    simple: true,
  }, 5)
}

/**
 * Fetch commits for a project within a date range.
 * Tries with_stats=true first; falls back without it for older GitLab instances.
 */
export async function fetchCommits(projectId, since, until) {
  try {
    return await paginateAll(`/projects/${encodeURIComponent(projectId)}/repository/commits`, {
      since,
      until,
      with_stats: true,
      all: true,        // include commits from ALL branches, not just default
    })
  } catch {
    return paginateAll(`/projects/${encodeURIComponent(projectId)}/repository/commits`, {
      since,
      until,
      all: true,
    })
  }
}

/**
 * Fetch merge requests for a project
 */
export async function fetchMergeRequests(projectId, since, until) {
  const mrs = await paginateAll(`/projects/${encodeURIComponent(projectId)}/merge_requests`, {
    created_after: since,
    created_before: until,
    scope: 'all',
    state: 'all',
    with_labels_details: true,
  })
  return mrs
}

/**
 * Fetch issues for a project
 */
export async function fetchIssues(projectId, since, until) {
  return paginateAll(`/projects/${encodeURIComponent(projectId)}/issues`, {
    created_after: since,
    created_before: until,
    scope: 'all',
    state: 'all',
    with_labels_details: true,
  })
}

/**
 * Fetch pipelines for a project within a date range
 */
export async function fetchPipelines(projectId, since, until) {
  return paginateAll(`/projects/${encodeURIComponent(projectId)}/pipelines`, {
    updated_after: since,
    updated_before: until,
    order_by: 'updated_at',
    sort: 'desc',
  }, 5)
}

/**
 * Test authentication — returns current user info
 */
export async function fetchCurrentUser() {
  const { data } = await gitlabFetch('/user')
  return data
}

/**
 * Fetch all members of a GitLab group (including inherited members).
 * Returns { id, username, name } per member.
 */
export async function fetchGroupMembers(groupId) {
  try {
    return await paginateAll(`/groups/${encodeURIComponent(groupId)}/members/all`, {}, 5)
  } catch {
    return []
  }
}
