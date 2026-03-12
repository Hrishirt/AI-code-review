from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    pr_number = Column(Integer, nullable=False)
    repo_owner = Column(String(255), nullable=False)
    repo_name = Column(String(255), nullable=False)
    pr_title = Column(String(500))
    pr_author = Column(String(255))
    pr_url = Column(String(1000))
    commit_sha = Column(String(40))
    base_branch = Column(String(255))
    head_branch = Column(String(255))

    # Review results
    overall_score = Column(Float)
    summary = Column(Text)
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    error_message = Column(Text)

    # GitHub metadata
    github_review_id = Column(Integer)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    comments = relationship("ReviewComment", back_populates="review", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_reviews_repo", "repo_owner", "repo_name"),
        Index("ix_reviews_pr", "repo_owner", "repo_name", "pr_number"),
    )

    @property
    def repo_full_name(self) -> str:
        return f"{self.repo_owner}/{self.repo_name}"


class ReviewComment(Base):
    __tablename__ = "review_comments"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(1000), nullable=False)
    line_number = Column(Integer)
    comment = Column(Text, nullable=False)
    severity = Column(String(50))   # info, warning, error
    category = Column(String(100))  # security, performance, style, logic, documentation
    github_comment_id = Column(Integer)
    posted_to_github = Column(Integer, default=0)  # 0 = no, 1 = yes

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    review = relationship("Review", back_populates="comments")

    __table_args__ = (
        Index("ix_review_comments_review_id", "review_id"),
    )
