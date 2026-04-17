"""AI Tools Hub — 分类模型（对应 categories 表）"""
import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, Text, Integer, Boolean, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import text

from app.core.database import Base


class Category(Base):
    """分类表 — 支持两级分类（一级分类 + 二级分类）"""

    __tablename__ = "categories"

    # ── 主键 ──────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("uuid_generate_v4()"),
    )

    # ── 基本信息 ──────────────────────────────────────
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="分类名称")
    slug: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, comment="URL 友好标识"
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="分类描述")

    # ── 层级关系 ──────────────────────────────────────
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        comment="父分类 ID",
    )
    level: Mapped[int] = mapped_column(Integer, nullable=False, default=1, comment="层级：1=一级, 2=二级")

    # ── 显示与排序 ────────────────────────────────────
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment="图标名称")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, comment="排序序号")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")

    # ── 时间戳 ────────────────────────────────────────
    created_at: Mapped[Optional[datetime]] = mapped_column(
        server_default=text("NOW()"), comment="创建时间"
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        server_default=text("NOW()"), comment="更新时间"
    )

    # ── 关系 ──────────────────────────────────────────
    parent: Mapped[Optional["Category"]] = relationship(
        "Category", remote_side=[id], back_populates="children", lazy="selectin"
    )
    children: Mapped[List["Category"]] = relationship(
        "Category", back_populates="parent", lazy="selectin"
    )
    tools: Mapped[List["Tool"]] = relationship(
        "Tool", back_populates="category", lazy="noload"
    )

    # ── 索引 ──────────────────────────────────────────
    __table_args__ = (
        Index("idx_categories_parent", "parent_id"),
        Index("idx_categories_slug", "slug"),
        Index("idx_categories_active", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<Category {self.name} (level={self.level})>"


# 避免循环导入，在模块级别建立前向引用
from app.models.tool import Tool  # noqa: E402, F401
