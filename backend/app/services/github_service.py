"""
GitHub REST API service.

Handles:
- Fetching PR metadata and diff
- Parsing diff to extract changed line numbers
- Posting pull request reviews with inline comments
"""
import re
import logging
from typing import Dict, Optional, Set, Any

import httpx

from ..config import settings

logger = logging.getLogger(__name__)

GITHUB_API_BASE = "https://api.github.com"
GITHUB_ACCEPT_JSON = "application/vnd.github+json"
GITHUB_ACCEPT_DIFF = "application/vnd.github.v3.diff"


def _headers(token: Optional[str] = None) -> Dict[str, str]:
    tok = token or settings.GITHUB_TOKEN
    h = {"Accept": GITHUB_ACCEPT_JSON, "X-GitHub-Api-Version": "2022-11-28"}
    if tok:
        h["Authorization"] = f"Bearer {tok}"
    return h


# ── Fetch PR details ────────────────────────────────────────────────────────

async def fetch_pr_details(owner: str, repo: str, pr_number: int) -> Dict[str, Any]:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=_headers())
        resp.raise_for_status()
        return resp.json()


# ── Fetch PR diff ───────────────────────────────────────────────────────────

async def fetch_pr_diff(owner: str, repo: str, pr_number: int) -> str:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}"
    headers = _headers()
    headers["Accept"] = GITHUB_ACCEPT_DIFF
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        return resp.text


# ── Diff parser ─────────────────────────────────────────────────────────────

def parse_diff_line_mapping(diff_text: str) -> Dict[str, Set[int]]:
    """
    Parse a unified diff and return a map of:
        file_path -> set of line numbers (in new file) present in the diff

    This includes both added lines (+) and context lines (space), but NOT
    removed lines (-).  We later use this to validate that Claude's suggested
    line numbers are actually reachable through the GitHub review API.
    """
    file_lines: Dict[str, Set[int]] = {}
    current_file: Optional[str] = None
    current_new_line: int = 0

    for raw_line in diff_text.split("\n"):
        # New file boundary
        if raw_line.startswith("diff --git "):
            m = re.search(r" b/(.+)$", raw_line)
            if m:
                current_file = m.group(1).strip()
                file_lines[current_file] = set()
            current_new_line = 0
            continue

        # Canonical new-file path (preferred over diff --git header)
        if raw_line.startswith("+++ b/"):
            current_file = raw_line[6:].strip()
            if current_file not in file_lines:
                file_lines[current_file] = set()
            continue

        # Ignore metadata lines
        if raw_line.startswith("--- ") or raw_line.startswith("+++ /dev/null"):
            continue

        # Hunk header: @@ -old_start[,count] +new_start[,count] @@
        if raw_line.startswith("@@ "):
            m = re.search(r"\+(\d+)", raw_line)
            if m:
                current_new_line = int(m.group(1)) - 1
            continue

        if current_file is None:
            continue

        if raw_line.startswith("-"):
            # Removed line – does not advance new-file counter
            pass
        elif raw_line.startswith("+"):
            # Added line
            current_new_line += 1
            file_lines[current_file].add(current_new_line)
        elif raw_line.startswith("\\"):
            # "No newline at end of file" pseudo-line
            pass
        else:
            # Context line
            current_new_line += 1
            file_lines[current_file].add(current_new_line)

    return file_lines


# ── Post review ─────────────────────────────────────────────────────────────

async def post_pr_review(
    owner: str,
    repo: str,
    pr_number: int,
    commit_sha: str,
    summary: str,
    overall_score: float,
    issues: list,
    valid_line_map: Dict[str, Set[int]],
) -> Optional[int]:
    """
    Post a pull request review with inline comments.

    Returns the GitHub review ID on success, None on failure.
    """
    # Build inline comments for lines that actually exist in the diff
    inline_comments = []
    fallback_lines = []

    for issue in issues:
        file_path = issue.get("file_path", "")
        line_number = issue.get("line_number")
        comment_body = issue.get("comment", "")
        severity = issue.get("severity", "info")
        category = issue.get("category", "other")

        severity_emoji = {"error": "🔴", "warning": "🟡", "info": "🔵"}.get(severity, "⚪")
        formatted = (
            f"{severity_emoji} **[{severity.upper()} / {category}]**\n\n{comment_body}"
        )

        file_valid_lines = valid_line_map.get(file_path, set())

        if line_number and line_number in file_valid_lines:
            inline_comments.append(
                {
                    "path": file_path,
                    "line": line_number,
                    "side": "RIGHT",
                    "body": formatted,
                }
            )
        else:
            # Cannot post as inline – accumulate for summary
            fallback_lines.append(f"**`{file_path}`** (line {line_number}): {formatted}")

    # Build the review body
    score_bar = _score_bar(overall_score)
    body_parts = [
        f"## 🤖 AI Code Review",
        f"",
        f"**Overall Score: {overall_score:.1f} / 10** {score_bar}",
        f"",
        f"### Summary",
        summary,
    ]

    if fallback_lines:
        body_parts += ["", "### Additional Issues", ""] + fallback_lines

    review_body = "\n".join(body_parts)

    payload: Dict[str, Any] = {
        "commit_id": commit_sha,
        "body": review_body,
        "event": "COMMENT",
        "comments": inline_comments,
    }

    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}/reviews"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload, headers=_headers())
            if resp.status_code in (200, 201):
                return resp.json().get("id")
            else:
                logger.error(
                    "GitHub review post failed %s: %s", resp.status_code, resp.text
                )
                # Retry without inline comments if they caused a 422
                if resp.status_code == 422 and inline_comments:
                    logger.warning("Retrying without inline comments")
                    payload["comments"] = []
                    resp2 = await client.post(url, json=payload, headers=_headers())
                    if resp2.status_code in (200, 201):
                        return resp2.json().get("id")
                return None
    except Exception as exc:  # noqa: BLE001
        logger.exception("Exception posting GitHub review: %s", exc)
        return None


def _score_bar(score: float) -> str:
    filled = round(score)
    empty = 10 - filled
    return "🟩" * filled + "⬜" * empty
