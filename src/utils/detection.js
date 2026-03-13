/**
 * Claude Code detection heuristics
 *
 * Configurable thresholds (via SettingsDrawer):
 *   conventionalCommit     — regex match on conventional commit prefix (feat:, fix:, etc.)
 *   filesChangedMultiplier — N× the author's avg files/commit
 *   mrDescriptionLength    — min chars in MR description
 *   issueClosureDays       — max days between MR merge and issue close
 *
 * Non-configurable (definitive signals):
 *   AI-Agent: <model>      — explicit AI-Agent trailer in commit/MR body
 *   Risk-Level: <level>    — structured commit trailer (your team's format)
 *   AI labels              — GitLab labels matching AI_LABEL_PATTERNS
 */

export const DEFAULT_THRESHOLDS = {
  conventionalCommit: true,       // boolean toggle
  filesChangedMultiplier: 1.8,    // > 1.8× avg = Claude-assisted
  mrDescriptionLength: 300,       // > 300 chars
  issueClosureDays: 3,            // closed within 3 days of related MR
}

const CONVENTIONAL_PREFIXES = /^(feat|fix|refactor|chore|docs|style|test|perf|ci|build|revert)(\(.+\))?!?:/i

// Matches "AI-Agent: claude-sonnet-4-6" or "AI-Agent: gpt-4o" etc.
const AI_AGENT_TRAILER = /^AI-Agent:\s*\S+/im

// Co-authored-by patterns for AI tools
const CO_AUTHOR_TRAILER = /^Co-Authored-By:\s*(.+)/im

// Known tool colours for the breakdown chart
export const TOOL_COLORS = {
  'Claude':      '#00D4FF',
  'Cursor':      '#F59E0B',
  'Antigravity': '#A78BFA',
  'Copilot':     '#22C55E',
  'ChatGPT':     '#F97316',
  'Gemini':      '#4ADE80',
  'Heuristic':   '#4B5680',
}

/**
 * Normalise a raw AI-Agent / Co-Authored-By value to a friendly tool name.
 */
function normaliseTool(raw) {
  const s = raw.toLowerCase()
  if (s.includes('claude'))       return 'Claude'
  if (s.includes('cursor'))       return 'Cursor'
  if (s.includes('antigravity'))  return 'Antigravity'
  if (s.includes('copilot'))      return 'Copilot'
  if (s.includes('gpt') || s.includes('openai') || s.includes('chatgpt')) return 'ChatGPT'
  if (s.includes('gemini'))       return 'Gemini'
  // Unknown but explicit — capitalise the raw value as-is
  return raw.split(/[-_]/)[0].charAt(0).toUpperCase() + raw.split(/[-_]/)[0].slice(1)
}

/**
 * Extract the AI tool name from a commit/MR message.
 * Returns null if no explicit tool signal is found.
 */
export function extractAITool(message = '') {
  // Priority 1: AI-Agent trailer  (most explicit)
  const agentMatch = message.match(/^AI-Agent:\s*(\S+)/im)
  if (agentMatch) return normaliseTool(agentMatch[1])

  // Priority 2: Co-Authored-By trailer
  const coMatch = message.match(/^Co-Authored-By:\s*(.+)/im)
  if (coMatch) {
    const val = coMatch[1].trim()
    const known = normaliseTool(val)
    // Only return if we actually recognised a tool (not a human name)
    if (known !== val) return known
  }

  // Priority 3: Antigravity signature — structured bullet body + complexity metrics
  const bulletLines = (message.match(/^- .{10,}/gim) || []).length
  if (bulletLines >= 2 && ANTIGRAVITY_COMPLEXITY.test(message)) return 'Antigravity'
  if (bulletLines >= 4) return 'Antigravity'

  // Priority 4: Cursor-style lowercase descriptive commit
  const fl = message.split('\n')[0].trim()
  if (fl.length >= 35 && CURSOR_COMMIT.test(fl) && !fl.startsWith('Merge ') && !fl.startsWith('Revert ')) {
    return 'Cursor'
  }

  // Priority 5b: descriptive action commit (Antigravity-style)
  if (fl.length >= 50 && DESCRIPTIVE_ACTION_COMMIT.test(fl) && !fl.startsWith('Merge ') && !fl.startsWith('Revert ')) {
    return 'Antigravity'
  }

  // Priority 5: Detailed conventional commit (Antigravity-style)
  const ccMatch = fl.match(/^(?:feat|fix|refactor|chore|docs|style|test|perf|ci|build|revert)(?:\(.+\))?!?:\s*(.+)/i)
  if (ccMatch && ccMatch[1].trim().length >= 40) {
    return 'Antigravity'
  }

  return null
}

// Matches "Risk-Level: Low/Medium/High" — your team's structured commit format
const RISK_LEVEL_TRAILER = /^Risk-Level:\s*(Low|Medium|High)/im

// Structured body sections typical of AI-generated commits
const STRUCTURED_BODY = /^(Changes:|Previously:|Reason:|Why:|Context:)/im

// Antigravity's signature: 3+ bullet-point lines AND/OR complexity metric language
// e.g. "- Extract hydrateCacheHit()..." / "cyclomatic complexity from 13 to ~4 (threshold: 10)"
const ANTIGRAVITY_BULLETS = /^- .{10,}/im
const ANTIGRAVITY_COMPLEXITY = /cyclomatic\s+complexity|complexity from \d+|threshold:\s*\d+/i

// Cursor-style commits: lowercase verb phrase, no colon prefix, descriptive sentence
// e.g. "validate and sanitize cancel URL input for improved security"
//      "add font_family key to whitelabel_customization array for future customization"
//      "increase processing-lock TTL to 90s to prevent duplicate finalization"
// Pattern: starts lowercase verb, 35+ chars, contains "for/to/in/by/with/and" purpose clause, single line
const CURSOR_COMMIT = /^[a-z]+(?: \w+){3,} (?:for|to|in|by|with|and) \w/

// Descriptive uppercase-verb commit: starts with an action word, 50+ chars
// e.g. "Rename index 'idx_pending2failed' to 'idx_pending2failed_cashxxx' on transaction_credit table for clarity"
// e.g. "Refactor CIL charge card check to include additional payment method indicator."
const DESCRIPTIVE_ACTION_COMMIT = /^(?:Rename|Refactor|Update|Add|Remove|Fix|Improve|Enhance|Implement|Migrate|Extract|Move|Delete|Optimise|Optimize|Replace|Handle|Include|Configure|Enable|Disable|Convert|Apply|Create|Introduce|Ensure|Validate|Resolve|Simplify|Consolidate|Restructure) .{40,}/

// GitLab label names that indicate AI usage (case-insensitive)
export const AI_LABEL_PATTERNS = [
  // Legacy / generic
  /^ai[-_]assisted$/i,
  /^claude([-_]code)?$/i,
  /^ai[-_]agent$/i,
  /^llm[-_]assisted$/i,
  /^copilot$/i,
  /^ai$/i,
  /^antigravity$/i,
  // Tool labels  (code::*)
  /^code::claude-code$/i,
  /^code::cursor$/i,
  /^code::copilot$/i,
  /^code::codex$/i,
  /^code::antigravity$/i,
  /^code::gemini-cli$/i,
  // Role labels  (ai::*)
  /^ai::generated$/i,
  /^ai::assisted$/i,
  /^ai::reviewed$/i,
  /^ai::debugged$/i,
  /^ai::refactored$/i,
  /^ai::tests$/i,
  /^ai::docs$/i,
  // Review labels
  /^review::ai$/i,
  /^review::mixed$/i,
  // Confidence labels
  /^ai-trust::shipped-as-is$/i,
  /^ai-trust::modified$/i,
  /^ai-trust::heavily-edited$/i,
]

/** Extract the specific AI tool from MR/issue labels */
export function extractToolFromLabels(labels = []) {
  for (const label of labels) {
    const name = (typeof label === 'string' ? label : label?.name || '').toLowerCase()
    if (name === 'code::claude-code' || name === 'claude' || name === 'claude-code') return 'Claude'
    if (name === 'code::cursor'      || name === 'cursor')       return 'Cursor'
    if (name === 'code::copilot'     || name === 'copilot')      return 'Copilot'
    if (name === 'code::codex')                                   return 'ChatGPT'
    if (name === 'code::antigravity' || name === 'antigravity')  return 'Antigravity'
    if (name === 'code::gemini-cli'  || name === 'gemini')       return 'Gemini'
  }
  return null
}

/** Return all structured AI labels on an MR/issue grouped by category */
export function parseAILabels(labels = []) {
  const tool       = []
  const role       = []
  const review     = []
  const confidence = []

  for (const label of labels) {
    const name = typeof label === 'string' ? label : label?.name || ''
    const lc   = name.toLowerCase()
    if (lc.startsWith('code::'))     tool.push(name)
    else if (lc.startsWith('ai::'))  role.push(name)
    else if (lc.startsWith('review::')) review.push(name)
    else if (lc.startsWith('ai-trust::')) confidence.push(name)
  }
  return { tool, role, review, confidence }
}

function hasAILabel(labels = []) {
  return labels.some(label => {
    const name = typeof label === 'string' ? label : label?.name || ''
    return AI_LABEL_PATTERNS.some(re => re.test(name))
  })
}

/**
 * Detect if a commit is Claude-assisted
 */
export function isClaudeCommit(commit, avgFilesChanged, thresholds = DEFAULT_THRESHOLDS) {
  const reasons = []
  const message = commit.message || ''

  // Definitive: explicit AI-Agent trailer (e.g. "AI-Agent: claude-sonnet-4-6")
  if (AI_AGENT_TRAILER.test(message)) {
    reasons.push('ai_agent_trailer')
  }

  // Definitive: Co-Authored-By with a known AI tool (e.g. "Co-authored-by: Cursor <cursoragent@cursor.com>")
  const coMatch = message.match(CO_AUTHOR_TRAILER)
  if (coMatch && extractAITool(message)) {
    reasons.push('co_author_trailer')
  }

  // Definitive: Risk-Level trailer — indicates your team's structured commit format
  if (RISK_LEVEL_TRAILER.test(message)) {
    reasons.push('risk_level_trailer')
  }

  // Definitive: conventional commit prefix (feat:, fix:, etc.) — this team uses these for AI commits
  if (thresholds.conventionalCommit && CONVENTIONAL_PREFIXES.test(message.trim())) {
    reasons.push('conventional_commit')
  }

  // Definitive: conventional commit with a detailed description (Antigravity-style)
  // e.g. "feat: Implement Redis connection shutdown handler and add new Redis extension options."
  // Short ones like "fix: typo" stay heuristic only
  const ccMatch = message.trim().match(/^(?:feat|fix|refactor|chore|docs|style|test|perf|ci|build|revert)(?:\(.+\))?!?:\s*(.+)/i)
  if (ccMatch && ccMatch[1].trim().length >= 40) {
    reasons.push('detailed_conventional_commit')
  }

  // Heuristic: structured body sections typical of AI-generated commits
  if (STRUCTURED_BODY.test(message)) {
    reasons.push('structured_body')
  }

  // Heuristic: Antigravity signature — bullet body + complexity metrics
  const bulletCount = (message.match(/^- .{10,}/gim) || []).length
  if (bulletCount >= 2 && ANTIGRAVITY_COMPLEXITY.test(message)) {
    reasons.push('antigravity_pattern')
  } else if (bulletCount >= 4) {
    reasons.push('antigravity_pattern')
  }

  // Heuristic: Cursor-style — lowercase descriptive verb phrase with purpose clause, 35+ chars
  // e.g. "validate and sanitize cancel URL input for improved security"
  // Exclude merge commits and very short messages
  const firstLine = message.split('\n')[0].trim()
  if (
    firstLine.length >= 35 &&
    CURSOR_COMMIT.test(firstLine) &&
    !firstLine.startsWith('Merge ') &&
    !firstLine.startsWith('Revert ')
  ) {
    reasons.push('cursor_style')
  }

  // Definitive: descriptive uppercase-verb commit (Antigravity-style without conventional prefix)
  if (
    firstLine.length >= 50 &&
    DESCRIPTIVE_ACTION_COMMIT.test(firstLine) &&
    !firstLine.startsWith('Merge ') &&
    !firstLine.startsWith('Revert ')
  ) {
    reasons.push('descriptive_action_commit')
  }

  // Heuristic: high files-changed count relative to average
  const filesChanged = commit.stats?.total ?? 0
  if (avgFilesChanged > 0 && filesChanged > avgFilesChanged * thresholds.filesChangedMultiplier) {
    reasons.push('high_files_changed')
  }

  const DEFINITIVE = ['ai_agent_trailer', 'co_author_trailer', 'risk_level_trailer', 'antigravity_pattern', 'cursor_style', 'detailed_conventional_commit', 'conventional_commit', 'descriptive_action_commit']
  const hasDefinitive = reasons.some(r => DEFINITIVE.includes(r))
  const heuristicCount = reasons.filter(r => !DEFINITIVE.includes(r)).length

  // A commit is AI-assisted only if:
  //   - it has at least one definitive signal (explicit trailer or Antigravity pattern), OR
  //   - it has 2+ independent heuristic signals (e.g. conventional commit + high files changed)
  // This prevents conventional commits like "fix: typo" from falsely attributing non-AI devs.
  const isAI = hasDefinitive || heuristicCount >= 2

  return {
    isClaudeAssisted: isAI,
    reasons,
    filesChanged,
    aiTool: isAI ? (extractAITool(message) ?? (hasDefinitive ? null : 'Heuristic')) : null,
  }
}

/**
 * Detect if an MR was AI-assisted.
 * Only explicit signals count — description length and conventional title
 * are NOT used because GitLab templates produce long descriptions for all MRs.
 */
export function isClaudeMR(mr) {
  const reasons = []
  const desc = mr.description || ''

  // Definitive: AI label on the MR (ai::generated, ai::assisted, code::*, etc.)
  if (hasAILabel(mr.labels)) {
    reasons.push('ai_label')
  }

  // Definitive: explicit AI-Agent trailer in description
  if (AI_AGENT_TRAILER.test(desc)) {
    reasons.push('ai_agent_trailer')
  }

  // Definitive: Co-Authored-By with a known AI tool
  const coMatch = desc.match(CO_AUTHOR_TRAILER)
  if (coMatch && extractAITool(desc)) {
    reasons.push('co_author_trailer')
  }

  const isAI = reasons.length > 0
  return {
    isClaudeAssisted: isAI,
    reasons,
    aiTool: isAI ? (extractToolFromLabels(mr.labels) ?? extractAITool(desc) ?? null) : null,
  }
}

/**
 * Detect if an issue was created with AI assistance.
 * Label-only detection — fast_closure_after_mr removed as it tagged ALL issues.
 */
export function isClaudeIssue(issue) {
  const reasons = []
  if (hasAILabel(issue.labels)) {
    reasons.push('ai_label')
  }
  return {
    isClaudeAssisted: reasons.length > 0,
    reasons,
  }
}

/**
 * Compute average files changed per commit
 */
export function computeAvgFilesChanged(commits) {
  if (!commits.length) return 0
  const total = commits.reduce((sum, c) => sum + (c.stats?.total ?? 0), 0)
  return total / commits.length
}

/**
 * Categorise Claude usage by type (for the donut chart)
 */
export function categoriseClaudeUsage(claudeCommits, claudeMRs, claudeIssues) {
  let codeGen       = 0
  let bugFix        = 0
  let commitMessages = 0
  let mrDescriptions = 0

  claudeCommits.forEach(({ commit, reasons }) => {
    const msg = commit.message?.toLowerCase() || ''

    if (reasons.includes('ai_agent_trailer') || reasons.includes('risk_level_trailer')) {
      // Structured commits from Claude — classify by content
      if (msg.match(/^(fix|revert|bug|patch)/)) bugFix++
      else codeGen++
    } else if (reasons.includes('conventional_commit')) {
      if (msg.startsWith('fix') || msg.startsWith('revert')) bugFix++
      else if (reasons.includes('high_files_changed')) codeGen++
      else commitMessages++
    } else if (reasons.includes('structured_body')) {
      codeGen++
    } else if (reasons.includes('high_files_changed')) {
      codeGen++
    }
  })

  claudeMRs.forEach(({ reasons }) => {
    if (reasons.includes('detailed_description') || reasons.includes('ai_agent_trailer')) mrDescriptions++
    if (reasons.includes('conventional_title')) codeGen++
  })

  return [
    { name: 'Code Generation', value: codeGen,         color: '#00D4FF' },
    { name: 'Bug Fixing',      value: bugFix,           color: '#F59E0B' },
    { name: 'Commit Messages', value: commitMessages,   color: '#A78BFA' },
    { name: 'MR Descriptions', value: mrDescriptions,   color: '#22C55E' },
  ].filter(d => d.value > 0)
}
