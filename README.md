# AI Observatory — GitLab AI Analytics Dashboard

> Claude Code, Cursor, Copilot, Codex — great tools. GitLab analytics for them? Nonexistent. So I built my own.

None of the major AI coding assistants offer native GitLab integration for tracking actual usage across your team. No dashboards, no adoption metrics, no way to answer *"are we actually using these tools, and how much?"*

**AI Observatory** is a self-hosted React dashboard that plugs into your GitLab instance and answers exactly that.

![Dashboard Preview](https://github.com/PuvaanRaaj/claude-gitlab-analytics/raw/master/docs/preview.png)

---

## Features

- **AI commit detection** — identifies AI-assisted commits via:
  - `Co-Authored-By: Cursor <cursoragent@cursor.com>` and `Co-Authored-By: Claude Sonnet 4.6` trailers
  - `AI-Agent: <model>` headers
  - Cursor-style descriptive commit messages
  - Conventional commits with detailed descriptions (Antigravity-style)
  - GitLab labels: `ai::generated`, `ai::assisted`, `code::cursor`, `code::claude-code`, `ai-trust::*`, etc.
- **Personal vs team views** — your own stats on Overview, full team breakdown on Team tab
- **Per-developer breakdown** — who's adopting AI, at what confidence level (confirmed / heuristic / manual)
- **MR & Issue attribution** — label-based detection only (no false positives from long GitLab templates)
- **Fully AI Generated vs Partially AI Assisted** cards on the MRs page
- **Click any team member** to drill into their commits, AI MRs, and AI issues
- **Team page access control** — restrict visibility to specific GitLab usernames
- **PDF export** of team adoption report
- **No backend** — pure React SPA, connects directly to your GitLab via a personal access token

---

## Tech Stack

- **React 18** + **Vite 5**
- **Recharts** for charts
- **Tailwind CSS** with custom dark theme
- **GitLab REST API v4**
- **jsPDF** for PDF export

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/PuvaanRaaj/claude-gitlab-analytics.git
cd claude-gitlab-analytics
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Your GitLab instance URL (default: https://gitlab.com)
VITE_GITLAB_URL=https://gitlab.com

# Personal access token with read_api scope
VITE_GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx

# Comma-separated GitLab usernames allowed to view the Team tab
# Leave empty to block Team view for everyone (configure via Settings drawer instead)
VITE_TEAM_ALLOWED_USERS=your_username,teammate1,teammate2
```

> **Token security**: if you're hosting this for others, leave `VITE_GITLAB_TOKEN` empty and have each user enter their token via the login screen. Tokens are stored in `localStorage` only, never sent anywhere except your GitLab instance.

### 3. Run locally

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
# Serve the dist/ folder from any static host (Nginx, Netlify, Vercel, S3, etc.)
```

---

## Configuration

### Team Page Access Control

The Team tab is **blocked by default**. To grant access:

**Option A — Environment variable** (set once at deploy time):
```env
VITE_TEAM_ALLOWED_USERS=alice,bob,charlie
```

**Option B — Settings drawer** (per-browser, stored in localStorage):
Click the ⚙ Settings icon → Team Access → enter GitLab usernames.

---

## AI Detection Logic

### Commits

| Signal | Type | Example |
|--------|------|---------|
| `Co-Authored-By:` with known AI tool | Definitive | `Co-Authored-By: Cursor <cursoragent@cursor.com>` |
| `AI-Agent:` trailer | Definitive | `AI-Agent: claude-sonnet-4-6` |
| `Risk-Level:` trailer | Definitive | `Risk-Level: Low` |
| Cursor-style message | Definitive | `add accessible caption to BAY IB transaction table` |
| Detailed conventional commit | Definitive | `feat: implement Redis shutdown handler and add new options` |
| Antigravity bullet body | Definitive | 4+ bullet lines or complexity metrics |
| Conventional prefix + high file count | Heuristic (2 needed) | `fix: typo` + 12 files changed |

### MRs & Issues

Detection is **label-only** — description length is intentionally ignored to avoid false positives from GitLab templates.

| Label | Meaning |
|-------|---------|
| `ai::generated` | Fully AI generated |
| `ai::assisted` | Partially AI assisted |
| `code::claude-code` | Written with Claude Code |
| `code::cursor` | Written with Cursor |
| `code::copilot` | Written with GitHub Copilot |
| `ai-trust::shipped-as-is` | AI output used without edits |
| `ai-trust::modified` | AI output modified before merge |

---

## Project Structure

```
src/
├── api/           # GitLab REST API client
├── components/    # Reusable UI components
│   ├── TeamBreakdown.jsx   # Team adoption chart + user modal
│   ├── CommitList.jsx      # Personal commit list with AI badges
│   ├── MRList.jsx          # MR list with label badges
│   └── ...
├── hooks/
│   ├── useGitLabData.js    # Data fetching
│   └── useClaudeDetection.js # AI detection engine
├── pages/         # Overview, Commits, MRs, Issues, Team, Pipelines
└── utils/
    ├── detection.js        # All AI detection heuristics
    ├── cache.js            # localStorage cache with TTL
    └── dateHelpers.js
```

---

## License

MIT
