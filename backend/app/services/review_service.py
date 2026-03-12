"""
Orchestration service.

Ties together:
1. Fetching PR details + diff from GitHub
2. Running Claude analysis
3. Persisting results in PostgreSQL
4. Posting the review back to GitHub
"""
import logging
from typing import Any, Dict

from sqlalchemy.orm import Session

from ..models import Review, ReviewComment
from ..schemas import ClaudeReviewResult
from . import github_service, claude_service

logger = logging.getLogger(__name__)


async def process_pull_request(
    db: Session,
    owner: str,
    repo: str,
    pr_number: int,
    pr_data: Dict[str, Any],
) -> Review:
    """
    Full pipeline: fetch diff → analyse → store → post review.
    Returns the persisted Review object.
    """
    # ── 1. Create a "processing" record ───────────────────────────────────
    review = Review(
        pr_number=pr_number,
        repo_owner=owner,
        repo_name=repo,
        pr_title=pr_data.get("title"),
        pr_author=pr_data.get("user", {}).get("login"),
        pr_url=pr_data.get("html_url"),
        commit_sha=pr_data.get("head", {}).get("sha"),
        base_branch=pr_data.get("base", {}).get("ref"),
        head_branch=pr_data.get("head", {}).get("ref"),
        status="processing",
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    logger.info("Created review id=%d for %s/%s#%d", review.id, owner, repo, pr_number)

    try:
        # ── 2. Fetch PR diff ─────────────────────────────────────────────
        diff_text = await github_service.fetch_pr_diff(owner, repo, pr_number)

        if not diff_text.strip():
            review.status = "completed"
            review.overall_score = 10.0
            review.summary = "No changes detected in this PR."
            db.commit()
            return review

        # ── 3. Parse diff for valid line mapping ─────────────────────────
        valid_line_map = github_service.parse_diff_line_mapping(diff_text)

        # ── 4. Analyse with Claude ───────────────────────────────────────
        result: ClaudeReviewResult = await claude_service.analyse_diff(
            pr_title=pr_data.get("title", ""),
            pr_author=pr_data.get("user", {}).get("login", ""),
            base_branch=pr_data.get("base", {}).get("ref", ""),
            head_branch=pr_data.get("head", {}).get("ref", ""),
            diff_text=diff_text,
            valid_line_map=valid_line_map,
        )

        # ── 5. Persist review + comments ─────────────────────────────────
        review.overall_score = result.overall_score
        review.summary = result.summary
        review.status = "completed"

        comment_dicts = []
        for issue in result.issues:
            rc = ReviewComment(
                review_id=review.id,
                file_path=issue.file_path,
                line_number=issue.line_number,
                comment=issue.comment,
                severity=issue.severity,
                category=issue.category,
            )
            db.add(rc)
            comment_dicts.append(
                {
                    "file_path": issue.file_path,
                    "line_number": issue.line_number,
                    "comment": issue.comment,
                    "severity": issue.severity,
                    "category": issue.category,
                }
            )

        db.commit()
        db.refresh(review)

        # ── 6. Post review to GitHub ─────────────────────────────────────
        commit_sha = pr_data.get("head", {}).get("sha", "")
        if commit_sha and pr_data.get("state") == "open":
            github_review_id = await github_service.post_pr_review(
                owner=owner,
                repo=repo,
                pr_number=pr_number,
                commit_sha=commit_sha,
                summary=result.summary,
                overall_score=result.overall_score,
                issues=comment_dicts,
                valid_line_map=valid_line_map,
            )
            if github_review_id:
                review.github_review_id = github_review_id
                db.commit()
                logger.info("Posted GitHub review id=%d", github_review_id)

        logger.info(
            "Review completed id=%d score=%.1f issues=%d",
            review.id,
            result.overall_score,
            len(result.issues),
        )
        return review

    except Exception as exc:  # noqa: BLE001
        logger.exception("Review pipeline failed: %s", exc)
        review.status = "failed"
        review.error_message = str(exc)
        db.commit()
        return review
