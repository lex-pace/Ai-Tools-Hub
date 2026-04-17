"""AI Skills Hub — 技能模型（对应 skills 表）"""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Any

from sqlalchemy import (
    String, Text, Integer, Boolean, ForeignKey, Numeric, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import text

from app.core.database import Base


class Skill(Base):
    """Skills 主表 — 存储 AI 技能/工具信息"""

    __tablename__ = "skills"

    # ── 主键 ──────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("uuid_generate_v4()"),
    )

    # ── 基本信息 ──────────────────────────────────────
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="技能名称")
    slug: Mapped[str] = mapped_column(
        String(200), unique=True, nullable=False, comment="URL 友好标识"
    )
    description: Mapped[str] = mapped_column(Text, nullable=False, comment="简要描述")
    detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="详细介绍")

    # ── 分类与类型 ────────────────────────────────────
    skill_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="mcp_server", comment="技能类型"
    )
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        comment="所属分类 ID",
    )

    # ── 平台与标签（JSONB）────────────────────────────
    platforms: Mapped[Any] = mapped_column(
        JSONB, nullable=False, default=list, comment="支持的平台列表"
    )
    tags: Mapped[Any] = mapped_column(
        JSONB, nullable=False, default=list, comment="标签列表"
    )

    # ── 作者与版本 ────────────────────────────────────
    author: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, comment="作者")
    version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment="版本号")
    license: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment="许可证")

    # ── 外部链接 ──────────────────────────────────────
    github_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    homepage_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    gitee_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # ── 截图与文档 ────────────────────────────────────
    screenshots: Mapped[Any] = mapped_column(
        JSONB, default=list, comment="截图 URL 列表"
    )
    install_guide: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="安装指南")
    usage_examples: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="使用示例")

    # ── 质量与统计 ────────────────────────────────────
    quality_score: Mapped[Decimal] = mapped_column(
        Numeric(3, 2), default=Decimal("0"), comment="质量评分 0~1"
    )
    usage_count: Mapped[int] = mapped_column(Integer, default=0, comment="使用次数")
    favorite_count: Mapped[int] = mapped_column(Integer, default=0, comment="收藏次数")

    # ── 数据来源 ──────────────────────────────────────
    source: Mapped[str] = mapped_column(
        String(50), nullable=False, default="manual", comment="来源"
    )
    source_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, comment="来源 ID")

    # ── 状态与标记 ────────────────────────────────────
    status: Mapped[str] = mapped_column(String(20), default="active", comment="状态")
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否推荐")

    # ── 商业化预留字段 ────────────────────────────────
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否高级")
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否付费")
    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0"), comment="价格"
    )
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否认证")
    verified_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, comment="认证时间")
    is_sponsored: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否赞助")
    sponsor_info: Mapped[Any] = mapped_column(JSONB, nullable=True, comment="赞助信息")
    developer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, comment="开发者 ID"
    )

    # ── 时间戳 ────────────────────────────────────────
    published_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, comment="发布时间")
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, comment="最后同步时间")
    created_at: Mapped[Optional[datetime]] = mapped_column(
        server_default=text("NOW()"), comment="创建时间"
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        server_default=text("NOW()"), comment="更新时间"
    )

    # ── 关系 ──────────────────────────────────────────
    category: Mapped[Optional["Category"]] = relationship(
        "Category", back_populates="skills", lazy="selectin"
    )
    favorites: Mapped[List["Favorite"]] = relationship(
        "Favorite", back_populates="skill", lazy="noload"
    )
    reviews: Mapped[List["Review"]] = relationship(
        "Review", back_populates="skill", lazy="noload"
    )

    # ── 索引 ──────────────────────────────────────────
    __table_args__ = (
        Index("idx_skills_type", "skill_type"),
        Index("idx_skills_platforms", "platforms", postgresql_using="gin"),
        Index("idx_skills_category", "category_id"),
        Index("idx_skills_tags", "tags", postgresql_using="gin"),
        Index("idx_skills_quality", "quality_score"),
        Index("idx_skills_usage", "usage_count"),
        Index("idx_skills_status", "status"),
        Index("idx_skills_created", "created_at"),
        Index("idx_skills_source", "source", "source_id"),
    )

    def __repr__(self) -> str:
        return f"<Skill {self.name} ({self.skill_type})>"


# 避免循环导入
from app.models.category import Category  # noqa: E402, F401
from app.models.favorite import Favorite  # noqa: E402, F401
from app.models.review import Review  # noqa: E402, F401
