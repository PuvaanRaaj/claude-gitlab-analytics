import { useState, useEffect } from 'react'
import { fetchFlowEventsForItems } from '../api/labelEvents'
import { computeMRFlow, computeIssueFlow } from '../utils/flowMetrics'

/**
 * Lazily fetch label events and compute flow stage durations.
 * Only fires when `enabled` is true — use a "Load Flow Data" button to gate it.
 * Fetches are concurrency-limited (5 at a time) and cached per-item (24h).
 */
export function useFlowAnalytics(mrs = [], issues = [], enabled = false) {
  const [mrFlows,    setMrFlows]    = useState([])
  const [issueFlows, setIssueFlows] = useState([])
  const [loading,    setLoading]    = useState(false)
  const [fetched,    setFetched]    = useState(false)

  // Reset when the data set changes (e.g. time range or project selection changes)
  const mrKey    = mrs.map(m => m.id).join(',')
  const issueKey = issues.map(i => i.id).join(',')
  useEffect(() => { setFetched(false); setMrFlows([]); setIssueFlows([]) }, [mrKey, issueKey])

  useEffect(() => {
    if (!enabled || fetched) return

    // Include both merged (completed flow) and open (currently in progress) MRs
    const relevantMRs  = mrs.filter(mr => mr.state === 'merged' || mr.state === 'opened')
    const closedIssues = issues.filter(i => i.state === 'closed' && i.closed_at)

    // Cap at 150 most-recent to protect localStorage quota
    const mrsToFetch    = relevantMRs.slice(-150)
    const issuesToFetch = closedIssues.slice(-150)

    if (!mrsToFetch.length && !issuesToFetch.length) {
      setFetched(true)
      return
    }

    setLoading(true)
    Promise.all([
      fetchFlowEventsForItems(mrsToFetch,    'mrs'),
      fetchFlowEventsForItems(issuesToFetch, 'issues'),
    ]).then(([mrEvents, issueEvents]) => {
      setMrFlows(mrsToFetch.map((mr, i)       => computeMRFlow(mr,    mrEvents[i]    || [])))
      setIssueFlows(issuesToFetch.map((issue, i) => computeIssueFlow(issue, issueEvents[i] || [])))
      setFetched(true)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [enabled, fetched, mrKey, issueKey])

  return { mrFlows, issueFlows, loading, fetched }
}
