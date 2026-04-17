"""AI Tools Hub — 智能推荐 API 端点"""
import logging
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.exceptions import NotFoundError
from app.models.tool import Tool
from app.schemas.recommend import RecommendRequest, RecommendResponse
from app.services import recommend_service

logger = logging.getLogger(__name__)

router = APIRouter()


def tool_to_dict(tool: Tool) -> dict:
    """将 Tool ORM 对象转换为字典"""
    return {
        "id": str(tool.id),
        "name": tool.name,
        "slug": tool.slug,
        "description": tool.description or "",
        "tool_type": tool.tool_type or "",
        "tags": tool.tags or [],
        "platforms": tool.platforms or [],
        "author": tool.author or "",
        "icon_url": tool.icon_url or "",
        "quality_score": float(tool.quality_score) if tool.quality_score else 0,
        "usage_count": tool.usage_count or 0,
        "favorite_count": tool.favorite_count or 0,
        "source": tool.source or "",
        "status": tool.status or "",
    }


@router.post("", response_model=RecommendResponse, summary="智能推荐")
async def smart_recommend(
    body: RecommendRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    AI 智能推荐

    根据用户自然语言描述的需求，通过 LLM 理解意图并推荐最合适的 Tools。

    流程：
    1. LLM 分析用户需求，提取关键词、推荐工具类型和分类
    2. 使用关键词搜索匹配的 Tools（优先 ES，降级 PG）
    3. 返回推荐结果 + AI 推荐理由

    无需登录即可使用。
    """
    result = await recommend_service.smart_recommend(
        db=db,
        user_query=body.query,
        page=body.page,
        size=body.size,
    )

    return RecommendResponse(
        code=200,
        message="success",
        reasoning=result["reasoning"],
        keywords=result["keywords"],
        suggested_query=result["suggested_query"],
        data=result["data"],
        pagination=result["pagination"],
    )


@router.get("/related/{tool_id}", summary="相关推荐")
async def get_related_tools(
    tool_id: uuid.UUID,
    limit: int = Query(default=6, ge=1, le=20, description="返回数量"),
    db: AsyncSession = Depends(get_db),
):
    """基于标签 + 向量相似度的相关 Tools 推荐

    根据指定 Tool 的标签，查找标签重叠度最高的其他 Tools。
    """
    # 1. 获取当前 Tool 的标签
    stmt = select(Tool).where(Tool.id == tool_id, Tool.status == "active")
    result = await db.execute(stmt)
    tool = result.scalar_one_or_none()

    if not tool:
        raise NotFoundError("Tool", str(tool_id))

    tags = tool.tags or []
    if not tags:
        # 没有标签时返回同分类的热门 Tools
        if tool.category_id:
            stmt = (
                select(Tool)
                .where(
                    Tool.id != tool_id,
                    Tool.category_id == tool.category_id,
                    Tool.status == "active",
                )
                .order_by(Tool.quality_score.desc())
                .limit(limit)
            )
            result = await db.execute(stmt)
            related = result.scalars().all()
            return {"success": True, "data": [tool_to_dict(s) for s in related]}
        return {"success": True, "data": []}

    # 2. 基于标签重叠度查找相关 Tools
    # 使用 PostgreSQL JSONB 包含查询：tags @> ANY(单个标签数组)
    related_tools = []

    # 先找标签完全匹配的
    for tag in tags[:5]:  # 最多用前 5 个标签
        stmt = (
            select(Tool)
            .where(
                Tool.id != tool_id,
                Tool.status == "active",
                Tool.tags.contains([tag]),
            )
            .order_by(Tool.quality_score.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        for s in result.scalars().all():
            if s.id not in [r["id"] for r in related_tools]:
                related_tools.append(tool_to_dict(s))
            if len(related_tools) >= limit:
                break
        if len(related_tools) >= limit:
            break

    return {"success": True, "data": related_tools[:limit]}
