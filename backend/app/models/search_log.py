"""AI Tools Hub — 搜索日志模型（对应 search_logs 表）"""
import uuid
from datetime import datetime
from typing import Optional, Any

from sqlalchemy import String, Text, Integer, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import text

from app.core.database import Base


class SearchLog(Base):
    """搜索日志表 — 记录用户搜索行为"""

    __tablename__ = "search_logs"

    # ── 主键 ──────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("uuid_generate_v4()"),
    )

    # ── 搜索内容 ──────────────────────────────────────
    query: Mapped[str] = mapped_column(Text, nullable=False, comment="搜索关键词")
    query_type: Mapped[str] = mapped_column(
        String(20), default="keyword", comment="搜索类型"
    )
    results_count: Mapped[int] = mapped_column(Integer, default=0, comment="结果数量")

    # ── 用户信息 ──────────────────────────────────────
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="用户 ID（可选）",
    )

    # ── 过滤条件（JSONB）──────────────────────────────
    filters: Mapped[Any] = mapped_column(
        JSONB, default=dict, comment="搜索过滤条件"
    )

    # ── 其他信息 ──────────────────────────────────────
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, comment="IP 地址"
    )

    # ── 时间戳 ────────────────────────────────────────
    created_at: Mapped[Optional[datetime]] = mapped_column(
        server_default=text("NOW()"), comment="创建时间"
    )

    # ── 索引 ──────────────────────────────────────────
    __table_args__ = (
        Index("idx_search_logs_created", "created_at", postgresql_ops={"created_at": "DESC"}),
    )

    def __repr__(self) -> str:
        return f"<SearchLog query={self.query!r}>"
