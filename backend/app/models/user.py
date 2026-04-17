"""AI Tools Hub — 用户模型（对应 users 表）"""
import uuid
from datetime import datetime
from typing import Optional, Any

from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import text

from app.core.database import Base


class User(Base):
    """用户表"""

    __tablename__ = "users"

    # ── 主键 ──────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("uuid_generate_v4()"),
    )

    # ── 基本信息 ──────────────────────────────────────
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, comment="用户名")
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, comment="邮箱")
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False, comment="密码哈希")
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, comment="头像 URL")

    # ── 角色与等级 ────────────────────────────────────
    role: Mapped[str] = mapped_column(String(20), default="user", comment="角色：user/admin")
    tier: Mapped[str] = mapped_column(String(20), default="free", comment="等级：free/premium")
    tier_expires_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True, comment="等级过期时间"
    )

    # ── 偏好设置（JSONB）──────────────────────────────
    preferences: Mapped[Any] = mapped_column(
        JSONB, default=dict, comment="用户偏好设置"
    )

    # ── 状态 ──────────────────────────────────────────
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True, comment="最后登录时间"
    )

    # ── 时间戳 ────────────────────────────────────────
    created_at: Mapped[Optional[datetime]] = mapped_column(
        server_default=text("NOW()"), comment="创建时间"
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        server_default=text("NOW()"), comment="更新时间"
    )

    # ── 关系 ──────────────────────────────────────────
    favorites: Mapped[list["Favorite"]] = relationship(
        "Favorite", back_populates="user", lazy="noload"
    )
    reviews: Mapped[list["Review"]] = relationship(
        "Review", back_populates="user", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<User {self.username}>"
