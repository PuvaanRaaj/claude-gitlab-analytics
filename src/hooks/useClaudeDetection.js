import { useMemo } from 'react'
import {
  isClaudeCommit,
  isClaudeMR,
  isClaudeIssue,
  computeAvgFilesChanged,
  categoriseClaudeUsage,
  TOOL_COLORS,
} from '../utils/detection'

export function useClaudeDetection(commits, mrs, issues, thresholds) {
  return useMemo(() => {
    const avgFilesChanged = computeAvgFilesChanged(commits)

    // Tag commits
    const taggedCommits = commits.map(commit => {
      const result = isClaudeCommit(commit, avgFilesChanged, thresholds)
      return { commit, ...result }
    })

    // Tag MRs — label/trailer-only detection, no heuristics
    const taggedMRs = mrs.map(mr => {
      const result = isClaudeMR(mr)
      return { mr, ...result }
    })

    // Tag issues
    const taggedIssues = issues.map(issue => {
      const result = isClaudeIssue(issue)
      return { issue, ...result }
    })

    const claudeCommits  = taggedCommits.filter(t => t.isClaudeAssisted)
    const manualCommits  = taggedCommits.filter(t => !t.isClaudeAssisted)
    const claudeMRs      = taggedMRs.filter(t => t.isClaudeAssisted)
    const claudeIssues   = taggedIssues.filter(t => t.isClaudeAssisted)

    const claudeCommitIds = new Set(claudeCommits.map(t => t.commit.id))

    const usageBreakdown = categoriseClaudeUsage(claudeCommits, claudeMRs, claudeIssues)

    // Avg files changed: AI vs manual
    const avgClaudeFiles = claudeCommits.length > 0
      ? claudeCommits.reduce((s, t) => s + t.filesChanged, 0) / claudeCommits.length
      : 0
    const avgManualFiles = manualCommits.length > 0
      ? manualCommits.reduce((s, t) => s + t.filesChanged, 0) / manualCommits.length
      : 0

    // Tool breakdown — group all AI-assisted commits + MRs by detected tool
    const toolMap = {}
    ;[...claudeCommits.map(t => t.aiTool), ...claudeMRs.map(t => t.aiTool)].forEach(tool => {
      const key = tool || 'Heuristic'
      toolMap[key] = (toolMap[key] || 0) + 1
    })
    const toolBreakdown = Object.entries(toolMap)
      .map(([name, value]) => ({
        name,
        value,
        color: TOOL_COLORS[name] || '#94A3B8',
      }))
      .sort((a, b) => b.value - a.value)

    // Line change totals (requires with_stats — gracefully zero when unavailable)
    const claudeLines = claudeCommits.reduce((s, t) => ({
      additions: s.additions + (t.commit.stats?.additions ?? 0),
      deletions: s.deletions + (t.commit.stats?.deletions ?? 0),
    }), { additions: 0, deletions: 0 })

    const manualLines = manualCommits.reduce((s, t) => ({
      additions: s.additions + (t.commit.stats?.additions ?? 0),
      deletions: s.deletions + (t.commit.stats?.deletions ?? 0),
    }), { additions: 0, deletions: 0 })

    return {
      taggedCommits,
      taggedMRs,
      taggedIssues,
      claudeCommitIds,
      claudeCommits,
      manualCommits,
      claudeMRs,
      claudeIssues,
      usageBreakdown,
      toolBreakdown,
      avgClaudeFiles,
      avgManualFiles,
      avgFilesChanged,
      claudeLines,
      manualLines,
    }
  }, [commits, mrs, issues, JSON.stringify(thresholds)])
}
