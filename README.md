# AI Code Review Agent

> Automated pull request reviews powered by Claude. Every PR gets scored, summarized, and annotated with inline comments — directly on GitHub.

![Dashboard Screenshot](docs/dashboard.png)

---

## What it does

When a developer opens or updates a pull request, this agent automatically:

1. Receives the GitHub webhook event
2. Fetches the full PR diff
3. Sends it to Claude for analysis
4. Posts a scored review back to the PR with inline comments on specific lines
5. Logs everything to a dashboard with quality trends over time

The PR author sees this directly in GitHub under **Files Changed**:

```
AI Code Review — Overall Score: 6.2 / 10 🟩🟩🟩🟩🟩🟩⬜⬜⬜⬜

### Summary
The PR introduces a REST endpoint but contains a SQL injection vulnerability
on line 12 via unsanitized user input passed directly to the query string...
```

Plus inline markers on the exact diff lines — security issues, logic bugs, style violations, performance problems.

---

## Architecture

```
PR opened / updated
       │
       ▼
GitHub Webhook  ──HMAC-SHA256──►  POST /webhook/github
                                         │
                                         ▼
                                  Background task queued
                                  (FastAPI returns 200 immediately)
                                         │
                              ┌──────────┴──────────┐
                              ▼                     ▼
                     Fetch PR diff           Verify signature
                     (GitHub REST API)       (GITHUB_WEBHOOK_SECRET)
                              │
                              ▼
                     Send diff to Claude
                     (claude-sonnet-4-6)
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
             Save to PostgreSQL    Post review to GitHub
             (score, summary,      • Inline comments on diff lines
              per-line comments)   • Summary comment with score
                    │
                    ▼
             Dashboard (React)
             quality trends, issue breakdown, review history
```

**Triggers on:** `opened`, `synchronize` (new commits), `reopened`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, Python |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| Database | PostgreSQL |
| Frontend | React, TypeScript, Tailwind CSS |
| Infrastructure | Docker, Docker Compose |
| Auth | HMAC-SHA256 webhook verification, GitHub PAT |

---

## Getting Started

### Prerequisites

- Docker + Docker Compose
- A GitHub repository you control
- [Anthropic API key](https://console.anthropic.com)
- GitHub Personal Access Token

### 1. Clone and configure

```bash
git clone https://github.com/Hrishirt/AI-code-review.git
cd AI-code-review
cp env.example .env
```

Edit `.env`:

```bash
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# GitHub
GITHUB_TOKEN=ghp_...              # Scopes: repo + pull_requests (write)
GITHUB_WEBHOOK_SECRET=mysecret123 # Any string — must match GitHub webhook settings

# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=code_review

# App
LOG_LEVEL=INFO
```

### 2. Run

```bash
docker compose up --build
```

Services:
- **Backend API:** `http://localhost:8000`
- **Dashboard:** `http://localhost:5173`
- **PostgreSQL:** `localhost:5432`

### 3. Configure GitHub Webhook

In your GitHub repository → **Settings → Webhooks → Add webhook**:

| Field | Value |
|---|---|
| Payload URL | `https://your-domain.com/webhook/github` |
| Content type | `application/json` |
| Secret | Your `GITHUB_WEBHOOK_SECRET` value |
| Events | Pull requests |

> For local development, use [ngrok](https://ngrok.com) to expose your local server: `ngrok http 8000`

### 4. Open a PR

That's it. Open any pull request in your connected repository and the agent reviews it automatically within seconds.

---

## Dashboard

The React dashboard tracks:

- **Quality score over time** — see if your codebase is improving
- **Issues by category** — security, logic, style, performance breakdown  
- **Full review history** — every PR with inline comments and scores
- **Per-file drill-down** — exact line numbers, severity, category for each issue

---

## Example Review Output

**GitHub inline comment (line 47, `api/users.py`):**

```
⚠ warning · security

User input is passed directly to the SQL query without sanitization.
Use parameterized queries or an ORM to prevent SQL injection.
```

**Summary comment:**

```
🤖 AI Code Review — Overall Score: 7.4 / 10

### Summary
Clean separation of concerns and good test coverage on the happy path.
Primary concern is the unsanitized query on line 47 — critical to fix before merge.
Secondary: the retry logic in fetch_user() will silently swallow 404s.

Issues found: 8 (1 error, 5 warnings, 2 info)
Files reviewed: 3
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/webhook/github` | GitHub webhook receiver |
| `GET` | `/api/reviews` | List all reviews |
| `GET` | `/api/reviews/{id}` | Get review detail |
| `DELETE` | `/api/reviews/{id}` | Delete a review |
| `GET` | `/api/dashboard/stats` | Aggregate stats |
| `GET` | `/api/dashboard/quality-trend` | Score over time |
| `GET` | `/api/dashboard/category-breakdown` | Issues by category |

---

## License

MIT
