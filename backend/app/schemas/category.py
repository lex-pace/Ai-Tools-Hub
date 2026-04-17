"""AI Skills Hub — 分类 Schema"""
import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


class CategoryOut(BaseModel):
    """分类输出"""
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    level: int
    icon: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True
    skill_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # 子分类列表（树形结构时使用）
    children: List["CategoryOut"] = Field(default_factory=list, description="子分类")

    model_config = {"from_attributes": True}


class CategoryTree(BaseModel):
    """分类树输出"""
    items: List[CategoryOut] = Field(default_factory=list, description="分类树")


class CategoryBrief(BaseModel):
    """分类简要信息（用于技能列表中的分类字段）"""
    id: uuid.UUID
    name: str
    slug: str
    icon: Optional[str] = None

    model_config = {"from_attributes": True}
