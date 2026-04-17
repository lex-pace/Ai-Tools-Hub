"""AI Skills Hub — 搜索 Schema"""
from typing import Optional, List, Any

from pydantic import BaseModel, Field

from app.schemas.skill import SkillList


class SearchQuery(BaseModel):
    """搜索查询参数"""
    q: str = Field(..., min_length=1, max_length=200, description="搜索关键词")
    category_id: Optional[str] = Field(default=None, description="分类 ID 过滤")
    skill_type: Optional[str] = Field(default=None, description="技能类型过滤")
    page: int = Field(default=1, ge=1, description="页码")
    size: int = Field(default=20, ge=1, le=100, description="每页数量")
    sort: Optional[str] = Field(default=None, description="排序方式：quality_score/usage_count/created_at")


class SearchHit(BaseModel):
    """搜索结果项"""
    id: str
    name: str
    description: str
    skill_type: str
    tags: List[str] = Field(default_factory=list)
    quality_score: float = 0
    highlight: Optional[dict[str, List[str]]] = Field(default=None, description="高亮片段")


class SearchResult(BaseModel):
    """搜索结果"""
    items: List[Any] = Field(default_factory=list, description="搜索结果列表")
    total: int = Field(default=0, description="总结果数")
    query: str = Field(description="搜索关键词")
    page: int = Field(default=1, description="当前页码")
    size: int = Field(default=20, description="每页数量")
    pages: int = Field(default=0, description="总页数")
