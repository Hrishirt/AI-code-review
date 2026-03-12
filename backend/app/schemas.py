from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ── Review Comment Schemas ─────────────────────────────────────────────────

class ReviewCommentBase(BaseModel):
    file_path: str
    line_number: Optional[int] = None
    comment: str
    severity: Optional[str] = None
    category: Optional[str] = None


class ReviewCommentCreate(ReviewCommentBase):
    review_id: int


class ReviewCommentOut(ReviewCommentBase):
    id: int
    review_id: int
    github_comment_id: Optional[int] = None
    posted_to_github: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ── Review Schemas ─────────────────────────────────────────────────────────

class ReviewBase(BaseModel):
    pr_number: int
    repo_owner: str
    repo_name: str
    pr_title: Optional[str] = None
    pr_author: Optional[str] = None
    pr_url: Optional[str] = None
    commit_sha: Optional[str] = None
    base_branch: Optional[str] = None
    head_branch: Optional[str] = None


class ReviewCreate(ReviewBase):
    pass


class ReviewUpdate(BaseModel):
    overall_score: Optional[float] = None
    summary: Optional[str] = None
    status: Optional[str] = None
    error_message: Optional[str] = None
    github_review_id: Optional[int] = None


class ReviewOut(ReviewBase):
    id: int
    overall_score: Optional[float] = None
    summary: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    github_review_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    comments: List[ReviewCommentOut] = []

    class Config:
        from_attributes = True


class ReviewSummary(BaseModel):
    """Lightweight review data for lists."""
    id: int
    pr_number: int
    repo_owner: str
    repo_name: str
    pr_title: Optional[str] = None
    pr_author: Optional[str] = None
    pr_url: Optional[str] = None
    overall_score: Optional[float] = None
    status: str
    comment_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ── Dashboard / Stats Schemas ──────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_reviews: int
    avg_score: Optional[float] = None
    repos_reviewed: int
    total_issues: int
    completed_reviews: int
    failed_reviews: int


class ScoreOverTime(BaseModel):
    date: str
    avg_score: float
    review_count: int


class CategoryBreakdown(BaseModel):
    category: str
    count: int


class SeverityBreakdown(BaseModel):
    severity: str
    count: int


# ── Claude analysis internal types ────────────────────────────────────────

class ClaudeIssue(BaseModel):
    file_path: str
    line_number: Optional[int] = None
    comment: str
    severity: str = Field(default="info", pattern="^(info|warning|error)$")
    category: str = Field(
        default="style",
        pattern="^(security|performance|style|logic|documentation|other)$",
    )


class ClaudeReviewResult(BaseModel):
    overall_score: float = Field(ge=1.0, le=10.0)
    summary: str
    issues: List[ClaudeIssue] = []


# ── Webhook payload (partial) ──────────────────────────────────────────────

class WebhookPRPayload(BaseModel):
    action: str
    number: int
