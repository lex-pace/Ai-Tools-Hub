"""采集任务模型（对应 crawl_tasks 表）"""
import uuid
from datetime import datetime
from typing import Optional, Any

from sqlalchemy import String, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import text

from app.core.database import Base


class CrawlTask(Base):
    """采集任务表 — 管理定时/手动数据采集任务"""

    __tablename__ = "crawl_tasks"

    # ── 主键 ──────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("uuid_generate_v4()"),
    )

    # ── 基本信息 ──────────────────────────────────────
    name: Mapped[str] = mapped_column(
        String(200), nullable=False, comment="任务名称"
    )
    source_type: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="采集源: github | gitee"
    )
    source_config: Mapped[Any] = mapped_column(
        JSONB, nullable=False, default=dict, comment="采集配置（query, sort, per_page 等）"
    )

    # ── 调度 ──────────────────────────────────────────
    schedule: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, comment="调度周期: daily | weekly | manual"
    )
    status: Mapped[str] = mapped_column(
        String(20), default="active", comment="任务状态: active | paused | disabled"
    )

    # ── 执行记录 ──────────────────────────────────────
    last_run_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True, comment="上次执行时间"
    )
    last_result: Mapped[Any] = mapped_column(
        JSONB, nullable=True, comment="上次执行结果摘要"
    )

    # ── 时间戳 ────────────────────────────────────────
    created_at: Mapped[Optional[datetime]] = mapped_column(
        server_default=text("NOW()"), comment="创建时间"
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        server_default=text("NOW()"), comment="更新时间"
    )

    # ── 索引 ──────────────────────────────────────────
    __table_args__ = (
        Index("idx_crawl_tasks_status", "status"),
        Index("idx_crawl_tasks_source", "source_type"),
    )

    def __repr__(self) -> str:
        return f"<CrawlTask {self.name} ({self.source_type})>"
