import { useState } from 'react'
import { DEFAULT_THRESHOLDS } from '../utils/detection'

function Slider({ label, desc, min, max, step, value, onChange, unit = '' }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-1.5">
        <label className="font-mono text-xs text-obs-text uppercase tracking-wider">{label}</label>
        <span className="font-mono text-sm text-obs-cyan font-semibold">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-obs-border rounded appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-obs-cyan [&::-webkit-slider-thumb]:shadow-cyan-glow
          [&::-webkit-slider-thumb]:cursor-pointer"
        style={{
          background: `linear-gradient(to right, #00D4FF ${((value - min) / (max - min)) * 100}%, #1A2035 0%)`,
        }}
      />
      <p className="font-mono text-xs text-obs-muted mt-1.5 leading-relaxed">{desc}</p>
    </div>
  )
}

function Toggle({ label, desc, value, onChange }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <button
        onClick={() => onChange(!value)}
        className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors mt-0.5 ${
          value ? 'bg-obs-cyan' : 'bg-obs-border2'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            value ? 'left-5' : 'left-0.5'
          }`}
        />
      </button>
      <div>
        <p className="font-mono text-xs text-obs-text uppercase tracking-wider">{label}</p>
        <p className="font-mono text-xs text-obs-muted mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

export default function SettingsDrawer({ open, onClose, thresholds, setThresholds, teamAllowedUsers = [], onSetTeamAllowedUsers }) {
  const [newUsername, setNewUsername] = useState('')

  function reset() {
    setThresholds(DEFAULT_THRESHOLDS)
  }

  function addUsername() {
    const u = newUsername.trim().toLowerCase()
    if (!u || teamAllowedUsers.includes(u)) { setNewUsername(''); return }
    onSetTeamAllowedUsers([...teamAllowedUsers, u])
    setNewUsername('')
  }

  function removeUsername(u) {
    onSetTeamAllowedUsers(teamAllowedUsers.filter(x => x !== u))
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 bg-obs-surface border-l border-obs-border
          transform transition-transform duration-300 ease-out flex flex-col`}
        style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-obs-border flex-shrink-0">
          <div>
            <h2 className="font-sans font-bold text-obs-text-bright">Detection Settings</h2>
            <p className="font-mono text-xs text-obs-muted mt-0.5">Adjust Claude heuristic thresholds</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-obs-card border border-obs-border flex items-center justify-center
              hover:border-obs-border2 transition-colors text-obs-muted hover:text-obs-text"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Always-on signals */}
          <div className="mb-7">
            <p className="font-mono text-[10px] text-obs-muted uppercase tracking-widest mb-2">Always detected</p>
            <div className="space-y-1.5">
              {[
                { tag: 'AI-Agent',    desc: 'AI-Agent: <model> trailer in commit/MR' },
                { tag: 'Risk-Level',  desc: 'Risk-Level: trailer in commit message' },
                { tag: 'structured',  desc: 'Changes: / Previously: body sections' },
                { tag: 'ai label',    desc: 'GitLab label: ai-assisted, claude, llm-assisted…' },
              ].map(({ tag, desc }) => (
                <div key={tag} className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 bg-obs-cyan/10 border border-obs-cyan/20 text-obs-cyan rounded px-1.5 py-0.5 font-mono text-[10px] flex-shrink-0">
                    <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    {tag}
                  </span>
                  <span className="font-mono text-[10px] text-obs-muted">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-obs-border mb-6" />

          <Toggle
            label="Conventional commits"
            desc="Tag commits that start with feat:, fix:, refactor:, chore:, etc. as Claude-assisted."
            value={thresholds.conventionalCommit}
            onChange={v => setThresholds(t => ({ ...t, conventionalCommit: v }))}
          />

          <Slider
            label="Files changed multiplier"
            desc="Commits with more than N× the author's average files changed are flagged."
            min={1.0}
            max={5.0}
            step={0.1}
            value={thresholds.filesChangedMultiplier}
            unit="×"
            onChange={v => setThresholds(t => ({ ...t, filesChangedMultiplier: v }))}
          />

          <Slider
            label="MR description length"
            desc="MRs with a description longer than N characters are considered Claude-assisted."
            min={50}
            max={1000}
            step={25}
            value={thresholds.mrDescriptionLength}
            unit=" chars"
            onChange={v => setThresholds(t => ({ ...t, mrDescriptionLength: v }))}
          />

          <Slider
            label="Issue fast-closure window"
            desc="Issues closed within N days after a related MR was merged are flagged."
            min={1}
            max={14}
            step={1}
            value={thresholds.issueClosureDays}
            unit=" days"
            onChange={v => setThresholds(t => ({ ...t, issueClosureDays: v }))}
          />

          <div className="border-t border-obs-border mb-6" />

          {/* Team page access control */}
          <div className="mb-6">
            <p className="font-mono text-[10px] text-obs-muted uppercase tracking-widest mb-1">Team page access</p>
            <p className="font-mono text-xs text-obs-muted mb-4 leading-relaxed">
              {teamAllowedUsers.length === 0
                ? 'Currently visible to everyone. Add GitLab usernames to restrict access.'
                : 'Only the listed GitLab usernames can see the Team page.'}
            </p>

            {/* Current allowed list */}
            {teamAllowedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {teamAllowedUsers.map(u => (
                  <span
                    key={u}
                    className="flex items-center gap-1.5 px-2 py-1 bg-obs-cyan/10 border border-obs-cyan/25 rounded-lg font-mono text-xs text-obs-cyan"
                  >
                    @{u}
                    <button
                      onClick={() => removeUsername(u)}
                      className="text-obs-muted hover:text-red-400 transition-colors leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add username input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addUsername()}
                placeholder="gitlab_username"
                className="flex-1 h-8 px-3 bg-obs-card border border-obs-border rounded-lg font-mono text-xs
                  text-obs-text placeholder-obs-muted/50 focus:outline-none focus:border-obs-cyan transition-colors"
              />
              <button
                onClick={addUsername}
                disabled={!newUsername.trim()}
                className="px-3 h-8 bg-obs-cyan/10 border border-obs-cyan/30 rounded-lg font-mono text-xs
                  text-obs-cyan hover:bg-obs-cyan/20 transition-colors disabled:opacity-30"
              >
                Add
              </button>
            </div>

            {teamAllowedUsers.length > 0 && (
              <button
                onClick={() => onSetTeamAllowedUsers([])}
                className="mt-2 font-mono text-[10px] text-obs-muted hover:text-red-400 transition-colors"
              >
                Remove all restrictions
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-obs-border flex-shrink-0 flex gap-3">
          <button
            onClick={reset}
            className="flex-1 py-2.5 rounded-lg font-mono text-xs border border-obs-border2
              text-obs-muted hover:text-obs-text hover:border-obs-cyan/30 transition-colors"
          >
            Reset defaults
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-mono text-xs bg-obs-cyan text-obs-bg
              hover:bg-obs-cyan-dim transition-colors font-semibold"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  )
}
