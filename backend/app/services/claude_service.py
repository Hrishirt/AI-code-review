"""
Anthropic Claude API service.

Sends a PR diff to Claude and parses a structured JSON response containing:
- overall_score  (1–10)
- summary        (narrative overview)
- issues         (list of inline comments with file, line, severity, category)
"""
import json
import logging
import re
from typing import Dict, Set, Optional

import anthropic

from ..config import settings
from ..schemas import ClaudeReviewResult, ClaudeIssue

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-6"
MAX_DIFF_CHARS = 60_000   # Truncate very large diffs to stay within context


SYSTEM_PROMPT = """\
You are an expert software engineer performing a thorough code review.
Your job is to analyse a GitHub pull request diff and return a structured JSON response.

Guidelines:
- Be constructive and specific.
- Focus on correctness, security, performance, maintainability and style.
- Only reference lines that appear in the diff (added "+" lines or context lines).
- Do NOT hallucinate file paths or line numbers.
- Severity levels: "error" (must fix), "warning" (should fix), "info" (nice to fix).
- Category values: security | performance | style | logic | documentation | other.
- Assign an overall_score between 1 (terrible) and 10 (excellent).

Return ONLY valid JSON matching this schema (no markdown fences, no prose):
{
  "overall_score": <number>,
  "summary": "<string>",
  "issues": [
    {
      "file_path": "<string>",
      "line_number": <integer or null>,
      "comment": "<string>",
      "severity": "error|warning|info",
      "category": "security|performance|style|logic|documentation|other"
    }
  ]
}
"""


def _build_user_prompt(
    pr_title: str,
    pr_author: str,
    base_branch: str,
    head_branch: str,
    diff_text: str,
    valid_line_map: Dict[str, Set[int]],
) -> str:
    # Build a compact line-availability hint so Claude knows which lines it can reference
    line_hints = []
    for path, lines in sorted(valid_line_map.items()):
        sorted_lines = sorted(lines)
        if sorted_lines:
            line_hints.append(f"  {path}: lines {sorted_lines[0]}–{sorted_lines[-1]}")
    line_hint_text = "\n".join(line_hints) if line_hints else "  (none detected)"

    # Truncate very large diffs
    if len(diff_text) > MAX_DIFF_CHARS:
        diff_text = diff_text[:MAX_DIFF_CHARS] + "\n\n[... diff truncated for length ...]"

    return f"""\
PR Title  : {pr_title}
Author    : {pr_author}
Base branch: {base_branch}
Head branch: {head_branch}

Available diff lines per file (use ONLY these):
{line_hint_text}

Full diff:
```diff
{diff_text}
```

Now provide your JSON code review.
"""


async def analyse_diff(
    pr_title: str,
    pr_author: str,
    base_branch: str,
    head_branch: str,
    diff_text: str,
    valid_line_map: Optional[Dict[str, Set[int]]] = None,
) -> ClaudeReviewResult:
    """
    Send the PR diff to Claude and parse the response.
    Returns a ClaudeReviewResult with score, summary, and issues list.
    """
    if valid_line_map is None:
        valid_line_map = {}

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    user_message = _build_user_prompt(
        pr_title=pr_title or "Untitled PR",
        pr_author=pr_author or "Unknown",
        base_branch=base_branch or "main",
        head_branch=head_branch or "feature",
        diff_text=diff_text,
        valid_line_map=valid_line_map,
    )

    logger.info("Sending diff to Claude (%d chars)", len(diff_text))

    message = await client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw_text = message.content[0].text.strip()
    logger.debug("Claude raw response: %s", raw_text[:500])

    return _parse_claude_response(raw_text)


def _parse_claude_response(raw: str) -> ClaudeReviewResult:
    """Parse Claude's JSON response, with graceful fallback."""
    # Strip markdown code fences if Claude added them anyway
    raw = re.sub(r"^```[a-z]*\n?", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"```$", "", raw, flags=re.MULTILINE).strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse Claude JSON: %s\nRaw: %s", exc, raw[:1000])
        # Fallback: return a generic review
        return ClaudeReviewResult(
            overall_score=5.0,
            summary=(
                "Automated review could not be fully parsed. "
                "Please review the diff manually.\n\nRaw response excerpt:\n"
                + raw[:500]
            ),
            issues=[],
        )

    # Validate / coerce fields
    score = float(data.get("overall_score", 5.0))
    score = max(1.0, min(10.0, score))

    issues = []
    for raw_issue in data.get("issues", []):
        try:
            issue = ClaudeIssue(
                file_path=str(raw_issue.get("file_path", "")),
                line_number=raw_issue.get("line_number"),
                comment=str(raw_issue.get("comment", "")),
                severity=_coerce_enum(
                    raw_issue.get("severity", "info"),
                    ["error", "warning", "info"],
                    "info",
                ),
                category=_coerce_enum(
                    raw_issue.get("category", "other"),
                    ["security", "performance", "style", "logic", "documentation", "other"],
                    "other",
                ),
            )
            issues.append(issue)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Skipping malformed issue: %s — %s", raw_issue, exc)

    return ClaudeReviewResult(
        overall_score=score,
        summary=str(data.get("summary", "No summary provided.")),
        issues=issues,
    )


def _coerce_enum(value: str, valid: list, default: str) -> str:
    v = str(value).lower().strip()
    return v if v in valid else default
