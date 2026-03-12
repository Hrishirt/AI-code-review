"""
GitHub Webhook endpoint.

Verifies the HMAC-SHA256 signature, filters for pull_request events,
and kicks off the background review pipeline.
"""
import hashlib
import hmac
import json
import logging

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request

from ..config import settings
from ..services import review_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["webhook"])

# PR actions that should trigger a review
TRIGGER_ACTIONS = {"opened", "synchronize", "reopened"}


def _verify_signature(payload_bytes: bytes, signature: str) -> bool:
    """Validate X-Hub-Signature-256 header."""
    if not settings.GITHUB_WEBHOOK_SECRET:
        logger.warning("GITHUB_WEBHOOK_SECRET not set – skipping signature check")
        return True
    if not signature or not signature.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(
        key=settings.GITHUB_WEBHOOK_SECRET.encode("utf-8"),
        msg=payload_bytes,
        digestmod=hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/github")
async def github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: str = Header(default="", alias="X-Hub-Signature-256"),
    x_github_event: str = Header(default="", alias="X-GitHub-Event"),
):
    payload_bytes = await request.body()

    # Verify signature
    if not _verify_signature(payload_bytes, x_hub_signature_256):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    # Only process pull_request events
    if x_github_event != "pull_request":
        logger.debug("Ignoring event: %s", x_github_event)
        return {"status": "ignored", "event": x_github_event}

    try:
        payload = json.loads(payload_bytes)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    action = payload.get("action", "")
    if action not in TRIGGER_ACTIONS:
        logger.debug("Ignoring PR action: %s", action)
        return {"status": "ignored", "action": action}

    pr_data = payload.get("pull_request", {})
    pr_number = pr_data.get("number")
    repo_data = payload.get("repository", {})
    owner = repo_data.get("owner", {}).get("login", "")
    repo = repo_data.get("name", "")

    if not all([pr_number, owner, repo]):
        raise HTTPException(status_code=400, detail="Missing required PR fields")

    logger.info("Queuing review for %s/%s#%d (action=%s)", owner, repo, pr_number, action)

    # Run in background so GitHub doesn't time out waiting for a response
    background_tasks.add_task(
        _run_review_pipeline,
        owner=owner,
        repo=repo,
        pr_number=pr_number,
        pr_data=pr_data,
    )

    return {"status": "queued", "repo": f"{owner}/{repo}", "pr": pr_number}


async def _run_review_pipeline(
    owner: str,
    repo: str,
    pr_number: int,
    pr_data: dict,
):
    """Background task — uses its own DB session (not request-scoped)."""
    from ..database import SessionLocal

    db = SessionLocal()
    try:
        await review_service.process_pull_request(
            db=db,
            owner=owner,
            repo=repo,
            pr_number=pr_number,
            pr_data=pr_data,
        )
    finally:
        db.close()
