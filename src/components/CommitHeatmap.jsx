import { useState } from 'react'
import { getDay, getHours, parseISO } from 'date-fns'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
// getDay: 0=Sun,1=Mon,...,6=Sat — remap to Mon=0..Sun=6
const DAY_MAP = [6, 0, 1, 2, 3, 4, 5] // DAY_MAP[getDay()] = row index (Mon=0)
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const X_AXIS_HOURS = [0, 3, 6, 9, 12, 15, 18, 21]

function buildGrid(taggedCommits) {
  // grid[row=day][col=hour] = { total, ai }
  const grid = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({ total: 0, ai: 0 }))
  )

  for (const { commit, isClaudeAssisted } of taggedCommits) {
    const raw = commit.authored_date || commit.created_at
    if (!raw) continue
    let d
    try { d = parseISO(raw) } catch { continue }
    const row = DAY_MAP[getDay(d)]
    const col = getHours(d)
    grid[row][col].total++
    if (isClaudeAssisted) grid[row][col].ai++
  }

  return grid
}

function cellColor(total, ai, maxCount) {
  if (total === 0) return 'rgba(26,32,53,0.6)' // empty grid dot
  const raw = total / maxCount
  const intensity = Math.min(1, Math.max(0.15, raw))
  const aiRatio = ai / total
  if (aiRatio >= 0.5) {
    return `rgba(0,212,255,${intensity})`
  }
  return `rgba(245,158,11,${intensity})`
}

function TooltipBox({ cell, day, hour }) {
  if (!cell) return null
  const hourStr = `${String(hour).padStart(2, '0')}:00`
  return (
    <div className="pointer-events-none absolute z-20 bg-obs-surface border border-obs-border rounded-lg p-2.5 text-xs font-mono shadow-lg whitespace-nowrap"
      style={{ bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' }}>
      <p className="text-obs-text-bright font-semibold mb-1">{day} {hourStr}</p>
      <p className="text-obs-muted">{cell.total} commit{cell.total !== 1 ? 's' : ''}, {cell.ai} AI</p>
    </div>
  )
}

export default function CommitHeatmap({ taggedCommits = [], loading }) {
  const [hovered, setHovered] = useState(null) // { row, col }

  if (loading) {
    return (
      <div className="bg-obs-surface border border-obs-border rounded-xl p-5">
        <div className="skeleton h-3 w-32 rounded mb-4" />
        <div className="skeleton h-48 w-full rounded" />
      </div>
    )
  }

  const grid = buildGrid(taggedCommits)
  const maxCount = Math.max(1, ...grid.flatMap(row => row.map(c => c.total)))
  const hasData = taggedCommits.length > 0

  const CELL_SIZE = 18
  const CELL_GAP = 3

  return (
    <div
      className="bg-obs-surface border border-obs-border rounded-xl p-5 animate-fade-up"
      style={{ animationDelay: '150ms', animationFillMode: 'both' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-sans font-semibold text-obs-text-bright text-sm">Commit Heatmap</h3>
          <p className="font-mono text-xs text-obs-muted mt-0.5">Activity by day of week &amp; hour</p>
        </div>
      </div>

      {!hasData ? (
        <div className="h-40 flex items-center justify-center">
          <p className="text-obs-muted text-sm font-mono">No commits in this period</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: 560 }}>
            {/* X-axis hour labels */}
            <div className="flex mb-1" style={{ paddingLeft: 36 }}>
              {HOURS.map(h => (
                <div
                  key={h}
                  style={{ width: CELL_SIZE + CELL_GAP, flexShrink: 0 }}
                  className="text-center"
                >
                  {X_AXIS_HOURS.includes(h) && (
                    <span className="text-obs-muted font-mono" style={{ fontSize: 10 }}>{h}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            {DAYS.map((day, row) => (
              <div key={day} className="flex items-center mb-0.5">
                {/* Y-axis label */}
                <div className="text-obs-muted font-mono text-right pr-2 flex-shrink-0" style={{ width: 32, fontSize: 10 }}>
                  {day}
                </div>

                {/* Cells */}
                {HOURS.map(col => {
                  const cell = grid[row][col]
                  const isHovered = hovered?.row === row && hovered?.col === col
                  return (
                    <div
                      key={col}
                      className="relative flex-shrink-0 rounded-sm cursor-default transition-transform duration-100"
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        marginRight: CELL_GAP,
                        background: cellColor(cell.total, cell.ai, maxCount),
                        transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                        zIndex: isHovered ? 10 : 1,
                      }}
                      onMouseEnter={() => setHovered({ row, col })}
                      onMouseLeave={() => setHovered(null)}
                    >
                      {isHovered && (
                        <TooltipBox cell={cell} day={day} hour={col} />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 pl-9">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[0.15, 0.4, 0.7, 1].map(op => (
                    <div
                      key={op}
                      className="rounded-sm"
                      style={{ width: 12, height: 12, background: `rgba(245,158,11,${op})` }}
                    />
                  ))}
                </div>
                <span className="text-obs-muted font-mono" style={{ fontSize: 10 }}>Manual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[0.15, 0.4, 0.7, 1].map(op => (
                    <div
                      key={op}
                      className="rounded-sm"
                      style={{ width: 12, height: 12, background: `rgba(0,212,255,${op})` }}
                    />
                  ))}
                </div>
                <span className="text-obs-muted font-mono" style={{ fontSize: 10 }}>AI-assisted</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
