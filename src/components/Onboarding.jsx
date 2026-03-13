import { useState } from 'react'
import { fetchCurrentUser } from '../api/gitlab'

export default function Onboarding({ onComplete }) {
  const [token, setToken] = useState('')
  const [url, setUrl] = useState('https://git2u.fiuu.com')
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)

  async function handleConnect() {
    if (!token.trim()) {
      setError('Personal access token is required')
      return
    }
    setTesting(true)
    setError(null)

    // Temporarily set in localStorage for the API call
    localStorage.setItem('gl_token', token.trim())
    localStorage.setItem('gl_url', url.trim().replace(/\/$/, ''))

    try {
      const u = await fetchCurrentUser()
      setUser(u)
    } catch (e) {
      setError(
        e.message === 'UNAUTHORIZED'
          ? 'Invalid token — check it has api scope'
          : `Connection failed: ${e.message}`
      )
      localStorage.removeItem('gl_token')
      localStorage.removeItem('gl_url')
    } finally {
      setTesting(false)
    }
  }

  function handleConfirm() {
    onComplete()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-obs-bg px-6">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid-dark bg-grid-sm opacity-100 pointer-events-none" />

      {/* Glow orb */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)' }}
      />

      <div
        className="relative z-10 w-full max-w-md animate-fade-up"
        style={{ animationDelay: '0.1s' }}
      >
        {/* Logo lockup */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-obs-surface border border-obs-border2 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="#00D4FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="text-left">
              <div className="font-mono text-xs text-obs-muted tracking-widest uppercase">AI</div>
              <div className="font-sans font-bold text-obs-text-bright text-lg leading-tight">Observatory</div>
            </div>
          </div>
          <p className="text-obs-muted text-sm font-mono leading-relaxed">
            Connect your GitLab to visualise<br />AI usage across your work.
          </p>
        </div>

        {/* Card */}
        <div className="bg-obs-surface border border-obs-border rounded-2xl p-8 shadow-card">
          {!user ? (
            <>
              <div className="mb-6">
                <label className="block font-mono text-xs text-obs-muted uppercase tracking-widest mb-2">
                  GitLab URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://git2u.fiuu.com"
                  className="w-full bg-obs-card border border-obs-border rounded-lg px-4 py-3 font-mono text-sm text-obs-text placeholder-obs-muted focus:outline-none focus:border-obs-cyan focus:ring-1 focus:ring-obs-cyan transition-colors"
                />
                <p className="mt-1.5 text-obs-muted text-xs font-mono">
                  Change for self-hosted GitLab instances
                </p>
              </div>

              <div className="mb-8">
                <label className="block font-mono text-xs text-obs-muted uppercase tracking-widest mb-2">
                  Personal Access Token
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConnect()}
                  placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-obs-card border border-obs-border rounded-lg px-4 py-3 font-mono text-sm text-obs-text placeholder-obs-muted focus:outline-none focus:border-obs-cyan focus:ring-1 focus:ring-obs-cyan transition-colors"
                />
                <p className="mt-1.5 text-obs-muted text-xs font-mono">
                  Needs <span className="text-obs-cyan">api</span> scope · stored in localStorage only
                </p>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm font-mono">{error}</p>
                </div>
              )}

              <button
                onClick={handleConnect}
                disabled={testing}
                className="w-full py-3 rounded-lg font-sans font-semibold text-sm tracking-wide transition-all
                  bg-obs-cyan text-obs-bg hover:bg-obs-cyan-dim disabled:opacity-40 disabled:cursor-wait
                  shadow-cyan-glow hover:shadow-none"
              >
                {testing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Verifying…
                  </span>
                ) : 'Connect GitLab'}
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="font-bold text-lg text-obs-text-bright mb-1">
                Connected as {user.name}
              </h3>
              <p className="text-obs-muted text-sm font-mono mb-8">@{user.username}</p>
              <button
                onClick={handleConfirm}
                className="w-full py-3 rounded-lg font-sans font-semibold text-sm tracking-wide
                  bg-obs-cyan text-obs-bg hover:bg-obs-cyan-dim transition-all shadow-cyan-glow hover:shadow-none"
              >
                Launch Observatory
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-obs-muted text-xs font-mono mt-6">
          Your token never leaves your browser.
        </p>
      </div>
    </div>
  )
}
