"""AI Skills Hub — 智能推荐 API 端点"""
import logging
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.exceptions import NotFoundError
from app.models.skill import Skill
from app.schemas.recommend import RecommendRequest, RecommendResponse
from app.services import recommend_service

logger = logging.getLogger(__name__)

router = APIRouter()


def skill_to_dict(skill: Skill) -> dict:
    """将 Skill ORM 对象转换为字典"""
    return {
        "id": str(skill.id),
        "name": skill.name,
        "slug": skill.slug,
        "description": skill.description or "",
        "skill_type": skill.skill_type or "",
        "tags": skill.tags or [],
        "platforms": skill.platforms or [],
        "author": skill.author or "",
        "icon_url": skill.icon_url or "",
        "quality_score": float(skill.quality_score) if skill.quality_score else 0,
        "usage_count": skill.usage_count or 0,
        "favorite_count": skill.favorite_count or 0,
        "source": skill.source or "",
        "status": skill.status or "",
    }


@router.post("", response_model=RecommendResponse, summary="智能推荐")
async def smart_recommend(
    body: RecommendRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    AI 智能推荐

    根据用户自然语言描述的需求，通过 LLM 理解意图并推荐最合适的 Skills。

    流程：
    1. LLM 分析用户需求，提取关键词、推荐技能类型和分类
    2. 使用关键词搜索匹配的 Skills（优先 ES，降级 PG）
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


@router.get("/related/{skill_id}", summary="相关推荐")
async def get_related_skills(
    skill_id: uuid.UUID,
    limit: int = Query(default=6, ge=1, le=20, description="返回数量"),
    db: AsyncSession = Depends(get_db),
):
    """基于标签 + 向量相似度的相关 Skills 推荐

    根据指定 Skill 的标签，查找标签重叠度最高的其他 Skills。
    """
    # 1. 获取当前 Skill 的标签
    stmt = select(Skill).where(Skill.id == skill_id, Skill.status == "active")
    result = await db.execute(stmt)
    skill = result.scalar_one_or_none()

    if not skill:
        raise NotFoundError("Skill", str(skill_id))

    tags = skill.tags or []
    if not tags:
        # 没有标签时返回同分类的热门 Skills
        if skill.category_id:
            stmt = (
                select(Skill)
                .where(
                    Skill.id != skill_id,
                    Skill.category_id == skill.category_id,
                    Skill.status == "active",
                )
                .order_by(Skill.quality_score.desc())
                .limit(limit)
            )
            result = await db.execute(stmt)
            related = result.scalars().all()
            return {"success": True, "data": [skill_to_dict(s) for s in related]}
        return {"success": True, "data": []}

    # 2. 基于标签重叠度查找相关 Skills
    # 使用 PostgreSQL JSONB 包含查询：tags @> ANY(单个标签数组)
    related_skills = []

    # 先找标签完全匹配的
    for tag in tags[:5]:  # 最多用前 5 个标签
        stmt = (
            select(Skill)
            .where(
                Skill.id != skill_id,
                Skill.status == "active",
                Skill.tags.contains([tag]),
            )
            .order_by(Skill.quality_score.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        for s in result.scalars().all():
            if s.id not in [r["id"] for r in related_skills]:
                related_skills.append(skill_to_dict(s))
            if len(related_skills) >= limit:
                break
        if len(related_skills) >= limit:
            break

    return {"success": True, "data": related_skills[:limit]}
