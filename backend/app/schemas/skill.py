"""AI Skills Hub — 技能 Schema"""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Any

from pydantic import BaseModel, Field

from app.schemas.category import CategoryBrief


class SkillList(BaseModel):
    """技能列表项（不含 detail 等大字段）"""
    id: uuid.UUID
    name: str
    slug: str
    description: str
    skill_type: str
    category: Optional[CategoryBrief] = None
    tags: List[str] = Field(default_factory=list)
    author: Optional[str] = None
    icon_url: Optional[str] = None
    quality_score: Decimal = Decimal("0")
    usage_count: int = 0
    favorite_count: int = 0
    is_featured: bool = False
    is_verified: bool = False
    status: str = "active"
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SkillDetail(BaseModel):
    """技能详情（完整信息）"""
    id: uuid.UUID
    name: str
    slug: str
    description: str
    detail: Optional[str] = None
    skill_type: str
    category: Optional[CategoryBrief] = None
    platforms: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    author: Optional[str] = None
    version: Optional[str] = None
    license: Optional[str] = None
    github_url: Optional[str] = None
    homepage_url: Optional[str] = None
    gitee_url: Optional[str] = None
    icon_url: Optional[str] = None
    screenshots: List[str] = Field(default_factory=list)
    install_guide: Optional[str] = None
    usage_examples: Optional[str] = None
    quality_score: Decimal = Decimal("0")
    usage_count: int = 0
    favorite_count: int = 0
    is_featured: bool = False
    is_verified: bool = False
    is_premium: bool = False
    is_paid: bool = False
    price: Decimal = Decimal("0")
    status: str = "active"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # 用户相关字段（根据登录状态动态填充）
    is_favorited: bool = False
    avg_rating: Optional[float] = None
    review_count: int = 0

    model_config = {"from_attributes": True}
