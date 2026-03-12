"""
Reviews CRUD + dashboard stats endpoints.
"""
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, desc
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import Review, ReviewComment
from ..schemas import (
    ReviewOut,
    ReviewSummary,
    DashboardStats,
    ScoreOverTime,
    CategoryBreakdown,
    SeverityBreakdown,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


# ── List reviews ────────────────────────────────────────────────────────────

@router.get("", response_model=List[ReviewSummary])
def list_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    repo: Optional[str] = Query(None, description="Filter by owner/repo or repo name"),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Review)

    if repo:
        if "/" in repo:
            owner, name = repo.split("/", 1)
            q = q.filter(Review.repo_owner == owner, Review.repo_name == name)
        else:
            q = q.filter(Review.repo_name == repo)

    if status:
        q = q.filter(Review.status == status)

    reviews = (
        q.order_by(desc(Review.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = []
    for r in reviews:
        count = db.query(func.count(ReviewComment.id)).filter(ReviewComment.review_id == r.id).scalar()
        s = ReviewSummary(
            id=r.id,
            pr_number=r.pr_number,
            repo_owner=r.repo_owner,
            repo_name=r.repo_name,
            pr_title=r.pr_title,
            pr_author=r.pr_author,
            pr_url=r.pr_url,
            overall_score=r.overall_score,
            status=r.status,
            comment_count=count or 0,
            created_at=r.created_at,
        )
        result.append(s)

    return result


# ── Get single review ────────────────────────────────────────────────────────

@router.get("/{review_id}", response_model=ReviewOut)
def get_review(review_id: int, db: Session = Depends(get_db)):
    review = (
        db.query(Review)
        .options(joinedload(Review.comments))
        .filter(Review.id == review_id)
        .first()
    )
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


# ── Delete review ────────────────────────────────────────────────────────────

@router.delete("/{review_id}")
def delete_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    db.delete(review)
    db.commit()
    return {"detail": "deleted"}


# ── Dashboard stats ──────────────────────────────────────────────────────────

@router.get("/stats/dashboard", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db)):
    total = db.query(func.count(Review.id)).scalar() or 0
    avg_score = db.query(func.avg(Review.overall_score)).filter(
        Review.overall_score.isnot(None)
    ).scalar()
    repos = db.query(func.count(func.distinct(
        func.concat(Review.repo_owner, "/", Review.repo_name)
    ))).scalar() or 0
    total_issues = db.query(func.count(ReviewComment.id)).scalar() or 0
    completed = db.query(func.count(Review.id)).filter(Review.status == "completed").scalar() or 0
    failed = db.query(func.count(Review.id)).filter(Review.status == "failed").scalar() or 0

    return DashboardStats(
        total_reviews=total,
        avg_score=round(avg_score, 2) if avg_score else None,
        repos_reviewed=repos,
        total_issues=total_issues,
        completed_reviews=completed,
        failed_reviews=failed,
    )


# ── Score over time ──────────────────────────────────────────────────────────

@router.get("/stats/score-over-time", response_model=List[ScoreOverTime])
def score_over_time(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)

    rows = (
        db.query(
            func.date(Review.created_at).label("date"),
            func.avg(Review.overall_score).label("avg_score"),
            func.count(Review.id).label("review_count"),
        )
        .filter(Review.created_at >= since, Review.overall_score.isnot(None))
        .group_by(func.date(Review.created_at))
        .order_by(func.date(Review.created_at))
        .all()
    )

    return [
        ScoreOverTime(
            date=str(row.date),
            avg_score=round(float(row.avg_score), 2),
            review_count=row.review_count,
        )
        for row in rows
    ]


# ── Category breakdown ───────────────────────────────────────────────────────

@router.get("/stats/categories", response_model=List[CategoryBreakdown])
def category_breakdown(db: Session = Depends(get_db)):
    rows = (
        db.query(ReviewComment.category, func.count(ReviewComment.id).label("count"))
        .filter(ReviewComment.category.isnot(None))
        .group_by(ReviewComment.category)
        .order_by(desc("count"))
        .all()
    )
    return [CategoryBreakdown(category=r.category, count=r.count) for r in rows]


# ── Severity breakdown ───────────────────────────────────────────────────────

@router.get("/stats/severities", response_model=List[SeverityBreakdown])
def severity_breakdown(db: Session = Depends(get_db)):
    rows = (
        db.query(ReviewComment.severity, func.count(ReviewComment.id).label("count"))
        .filter(ReviewComment.severity.isnot(None))
        .group_by(ReviewComment.severity)
        .order_by(desc("count"))
        .all()
    )
    return [SeverityBreakdown(severity=r.severity, count=r.count) for r in rows]
