"""采集相关 Schema"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class CrawlTaskCreate(BaseModel):
    """创建采集任务"""
    name: str
    source_type: str = Field(description="采集源: github | gitee")
    source_config: dict = Field(default_factory=dict, description="采集配置")
    schedule: Optional[str] = Field(default=None, description="调度周期: daily | weekly | manual")


class CrawlTaskOut(BaseModel):
    """采集任务输出"""
    id: uuid.UUID
    name: str
    source_type: str
    source_config: dict
    schedule: Optional[str]
    status: str
    last_run_at: Optional[datetime]
    last_result: Optional[dict]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class CrawlResultOut(BaseModel):
    """采集结果输出"""
    name: str
    description: str
    author: str
    github_url: str
    stars: int = 0
    forks: int = 0
    language: str = ""


class QuickCrawlRequest(BaseModel):
    """快速采集请求"""
    query: str = Field(default="mcp server", description="搜索关键词")
    source: str = Field(default="auto", description="采集源: auto | github | gitee")
    max_items: int = Field(default=30, ge=1, le=100, description="最大采集数量")


class CrawlResponse(BaseModel):
    """采集执行结果"""
    success: bool
    message: str
    created: int = 0
    updated: int = 0
    total: int = 0
