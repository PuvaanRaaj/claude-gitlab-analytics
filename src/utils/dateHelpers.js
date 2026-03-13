import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from 'date-fns'

export function getRangeISO(days) {
  const now = new Date()
  return {
    since: startOfDay(subDays(now, days)).toISOString(),
    until: endOfDay(now).toISOString(),
  }
}

export function getCustomRangeISO(fromDate, toDate) {
  return {
    since: startOfDay(new Date(fromDate)).toISOString(),
    until: endOfDay(new Date(toDate)).toISOString(),
  }
}

export function formatDate(isoString) {
  if (!isoString) return '—'
  return format(parseISO(isoString), 'MMM d, yyyy')
}

export function formatDateTime(isoString) {
  if (!isoString) return '—'
  return format(parseISO(isoString), 'MMM d, HH:mm')
}

/**
 * Build an array of daily buckets between two ISO dates
 * Returns: [{ date: 'Apr 1', dateISO: '2024-04-01', ... }]
 */
export function buildDailyBuckets(since, until) {
  const days = eachDayOfInterval({ start: new Date(since), end: new Date(until) })
  return days.map(d => ({
    date: format(d, 'MMM d'),
    dateISO: format(d, 'yyyy-MM-dd'),
    claude: 0,
    manual: 0,
  }))
}

/**
 * Assign commits to daily buckets
 */
export function bucketCommits(commits, claudeSet, since, until) {
  const buckets = buildDailyBuckets(since, until)
  const bucketMap = Object.fromEntries(buckets.map(b => [b.dateISO, b]))

  commits.forEach(commit => {
    const key = format(parseISO(commit.created_at || commit.authored_date), 'yyyy-MM-dd')
    if (bucketMap[key]) {
      if (claudeSet.has(commit.id)) {
        bucketMap[key].claude++
      } else {
        bucketMap[key].manual++
      }
    }
  })

  return buckets
}

/**
 * Calculate MR review duration in hours
 */
export function reviewDurationHours(mr) {
  if (!mr.merged_at || !mr.created_at) return null
  const ms = new Date(mr.merged_at) - new Date(mr.created_at)
  return Math.round(ms / (1000 * 60 * 60))
}

export function formatDuration(hours) {
  if (hours === null || hours === undefined) return '—'
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

/**
 * % change between current and previous period
 */
export function pctChange(current, previous) {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 100)
}
