"""AI Skills Hub — 评价模型（对应 reviews 表）"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, Integer, ForeignKey, Index, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import text

from app.core.database import Base


class Review(Base):
    """评价表 — 用户对技能的评分与评论"""

    __tablename__ = "reviews"

    # ── 主键 ──────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("uuid_generate_v4()"),
    )

    # ── 关联 ──────────────────────────────────────────
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="用户 ID",
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        comment="技能 ID",
    )

    # ── 评价内容 ──────────────────────────────────────
    rating: Mapped[int] = mapped_column(Integer, nullable=False, comment="评分 1~5")
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="评论内容")

    # ── 时间戳 ────────────────────────────────────────
    created_at: Mapped[Optional[datetime]] = mapped_column(
        server_default=text("NOW()"), comment="创建时间"
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        server_default=text("NOW()"), comment="更新时间"
    )

    # ── 关系 ──────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="reviews", lazy="selectin")
    skill: Mapped["Skill"] = relationship("Skill", back_populates="reviews", lazy="selectin")

    # ── 约束与索引 ────────────────────────────────────
    __table_args__ = (
        UniqueConstraint("user_id", "skill_id", name="uq_review_user_skill"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_review_rating_range"),
        Index("idx_reviews_skill", "skill_id"),
    )

    def __repr__(self) -> str:
        return f"<Review user={self.user_id} skill={self.skill_id} rating={self.rating}>"
