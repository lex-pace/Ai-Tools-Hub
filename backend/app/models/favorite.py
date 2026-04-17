"""AI Skills Hub — 收藏模型（对应 favorites 表）"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import text

from app.core.database import Base


class Favorite(Base):
    """收藏表 — 用户收藏技能"""

    __tablename__ = "favorites"

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

    # ── 分组 ──────────────────────────────────────────
    group_name: Mapped[str] = mapped_column(
        String(100), default="默认收藏夹", comment="收藏分组名"
    )

    # ── 时间戳 ────────────────────────────────────────
    created_at: Mapped[Optional[datetime]] = mapped_column(
        server_default=text("NOW()"), comment="创建时间"
    )

    # ── 关系 ──────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="favorites", lazy="selectin")
    skill: Mapped["Skill"] = relationship("Skill", back_populates="favorites", lazy="selectin")

    # ── 约束与索引 ────────────────────────────────────
    __table_args__ = (
        UniqueConstraint("user_id", "skill_id", "group_name", name="uq_favorite_user_skill_group"),
        Index("idx_favorites_user", "user_id"),
    )

    def __repr__(self) -> str:
        return f"<Favorite user={self.user_id} skill={self.skill_id}>"
