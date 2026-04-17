"""AI Tools Hub — 推荐 Schema"""
from pydantic import BaseModel, Field
from typing import Optional

from app.schemas.tool import ToolList
from app.schemas.common import PaginationOut


class RecommendRequest(BaseModel):
    """推荐请求"""
    query: str = Field(min_length=2, max_length=500, description="需求描述")
    page: int = Field(default=1, ge=1, description="页码")
    size: int = Field(default=10, ge=1, le=50, description="每页数量")


class RecommendResponse(BaseModel):
    """推荐响应"""
    code: int = Field(default=200, description="状态码")
    message: str = Field(default="success", description="提示信息")
    reasoning: str = Field(default="", description="AI 推荐理由")
    keywords: list[str] = Field(default_factory=list, description="提取的关键词")
    suggested_query: str = Field(default="", description="建议搜索词")
    data: list[ToolList] = Field(default_factory=list, description="推荐结果列表")
    pagination: Optional[PaginationOut] = Field(default=None, description="分页信息")
