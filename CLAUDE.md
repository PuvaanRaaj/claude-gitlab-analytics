# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A browser-only React + Vite dashboard that connects to the GitLab REST API and visualises activity through the lens of Claude Code usage. No backend — all API calls are made from the browser using a personal access token stored in `localStorage` (set via the Onboarding UI) or a `.env` file fallback.

## Commands

```bash
npm run dev      # start dev server at localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

No linter or test runner is configured. There is no `npm test`.

## Architecture

### Data flow

1. `App.jsx` holds all top-level state (time range, project selection, thresholds, dark mode).
2. `useGitLabData` fetches commits, MRs, and issues in parallel across selected projects via `src/api/gitlab.js`.
3. Raw data flows into `useClaudeDetection`, which applies the four heuristics from `src/utils/detection.js` and returns tagged arrays + derived sets (`claudeCommitIds`, `usageBreakdown`, etc.).
4. Tagged data is passed directly as props to the chart and list components — no global state manager.

### Claude detection heuristics (`src/utils/detection.js`)

All four heuristics are togglable/tunable via `SettingsDrawer` (stored in React state, not persisted):

| Heuristic | Default | What it tags |
|---|---|---|
| `conventionalCommit` | `true` | Commits matching `feat:`, `fix:`, `refactor:` etc. |
| `filesChangedMultiplier` | `1.8×` | Commits with files > 1.8× the author's average |
| `mrDescriptionLength` | `300 chars` | MRs with detailed descriptions |
| `issueClosureDays` | `3 days` | Issues closed within 3 days of any MR merge |

Adding a new heuristic requires changes to `detection.js` (logic), `useClaudeDetection.js` (apply it), and `SettingsDrawer.jsx` (expose the control).

### API client (`src/api/gitlab.js`)

- `paginateAll()` handles all pagination using `X-Next-Page` headers with `per_page=100`, capped at 20 pages.
- Token priority: `localStorage('gl_token')` → `VITE_GITLAB_TOKEN` env var.
- All data fetches use `scope: 'created_by_me'` — this dashboard only shows the authenticated user's own activity.
- `fetchCommits` uses `with_stats: true` to get `commit.stats.total` (required for the files-changed heuristic).

### Theming

Tailwind custom colours are under the `obs` namespace (e.g. `bg-obs-bg`, `text-obs-cyan`). The CSS variables in `src/index.css` are overridden under `.light` for light mode. Dark mode is toggled by adding/removing the `dark` and `light` classes on `<html>`.

## Config

```bash
cp .env.example .env
# set VITE_GITLAB_TOKEN and VITE_GITLAB_URL
```

If no token is found on load, the Onboarding screen prompts for credentials and verifies them against `/api/v4/user` before saving to `localStorage`.

## Commit Message Format

**Format:** `<type>(<scope>): <subject>` — max 72 chars, imperative mood

Types: `feat` | `fix` | `refactor` | `chore` | `docs` | `test`

**Body** (optional, add with a second `-m`):
- What changed and why
- Risk / rollback steps if non-trivial

**Trailers:**
```bash
git commit \
  --trailer "Risk-Level: low|medium|high" \
  --trailer "AI-Agent: claude-sonnet-4-6" \
  -m "fix(scope): subject line" \
  -m "- What changed and why
- Rollback: revert commit; describe any side effects"
```

Use `AI-Agent: claude-sonnet-4-6` or `AI-Agent: claude-opus-4-6` depending on which model generated the code.

