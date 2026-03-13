import { useState, useEffect, useCallback } from 'react'
import { fetchCommits, fetchMergeRequests, fetchIssues, fetchPipelines } from '../api/gitlab'
import { getRangeISO, getCustomRangeISO } from '../utils/dateHelpers'

export function useGitLabData(projectIds, timeRange, customRange) {
  const [commits, setCommits]       = useState([])
  const [mrs, setMrs]               = useState([])
  const [issues, setIssues]         = useState([])
  const [pipelines, setPipelines]   = useState([])
  const [loading, setLoading]       = useState(false)
  const [errors, setErrors]         = useState([])

  const { since, until } = timeRange === 'custom'
    ? getCustomRangeISO(customRange.from, customRange.to)
    : getRangeISO(timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30)

  const fetchAll = useCallback(async () => {
    if (!projectIds || projectIds.length === 0) return

    setLoading(true)
    setErrors([])

    const allCommits   = []
    const allMRs       = []
    const allIssues    = []
    const allPipelines = []
    const fetchErrors  = []

    await Promise.all(projectIds.map(async (pid) => {
      // Use allSettled so a single failing endpoint (e.g. commits on restricted repos)
      // doesn't block MRs and issues from loading.
      const [commitsRes, mrsRes, issuesRes, pipelinesRes] = await Promise.allSettled([
        fetchCommits(pid, since, until),
        fetchMergeRequests(pid, since, until),
        fetchIssues(pid, since, until),
        fetchPipelines(pid, since, until),
      ])

      if (commitsRes.status === 'fulfilled') {
        allCommits.push(...commitsRes.value.map(x => ({ ...x, _projectId: pid })))
      } else {
        fetchErrors.push(`Commits [${pid}]: ${commitsRes.reason?.message}`)
      }

      if (mrsRes.status === 'fulfilled') {
        allMRs.push(...mrsRes.value.map(x => ({ ...x, _projectId: pid })))
      } else {
        fetchErrors.push(`MRs [${pid}]: ${mrsRes.reason?.message}`)
      }

      if (issuesRes.status === 'fulfilled') {
        allIssues.push(...issuesRes.value.map(x => ({ ...x, _projectId: pid })))
      } else {
        fetchErrors.push(`Issues [${pid}]: ${issuesRes.reason?.message}`)
      }

      if (pipelinesRes.status === 'fulfilled') {
        allPipelines.push(...pipelinesRes.value.map(x => ({ ...x, _projectId: pid })))
      } else {
        // 403 on pipelines is common (no CI/CD access) — don't surface as a blocking error
        const msg = pipelinesRes.reason?.message || ''
        if (!msg.includes('403')) {
          fetchErrors.push(`Pipelines [${pid}]: ${msg}`)
        }
      }
    }))

    setCommits(allCommits)
    setMrs(allMRs)
    setIssues(allIssues)
    setPipelines(allPipelines)
    setErrors(fetchErrors)
    setLoading(false)
  }, [projectIds?.join(','), since, until])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Expose a single error string for display (first error) but keep all for debugging
  const error = errors.length > 0 ? errors[0] : null

  return {
    commits,
    mrs,
    issues,
    pipelines,
    loading,
    error,
    errors,
    retry: fetchAll,
    since,
    until,
  }
}
