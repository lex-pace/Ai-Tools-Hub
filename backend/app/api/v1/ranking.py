"""热门排行 API — 基于多维度排行"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.models.skill import Skill

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/skills", summary="热门 Skills 排行")
async def get_ranking(
    sort_by: str = Query(default="popular", description="排序维度: popular/quality/newest/trending"),
    category_id: Optional[str] = Query(default=None, description="按分类筛选"),
    skill_type: Optional[str] = Query(default=None, description="按技能类型筛选"),
    page: int = Query(default=1, ge=1, description="页码"),
    size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
):
    """获取热门 Skills 排行列表

    支持多维度排序：
    - popular: 按使用量（stars）降序
    - quality: 按质量评分降序
    - newest: 按创建时间降序
    - trending: 按最近同步时间降序
    """
    stmt = select(Skill).where(Skill.status == "active")

    # 分类筛选
    if category_id:
        stmt = stmt.where(Skill.category_id == category_id)

    # 类型筛选
    if skill_type:
        stmt = stmt.where(Skill.skill_type == skill_type)

    # 排序
    sort_map = {
        "popular": desc(Skill.usage_count),
        "quality": desc(Skill.quality_score),
        "newest": desc(Skill.created_at),
        "trending": desc(Skill.last_synced_at),
    }
    order_by = sort_map.get(sort_by, desc(Skill.usage_count))
    stmt = stmt.order_by(order_by)

    # 分页
    offset = (page - 1) * size
    stmt = stmt.offset(offset).limit(size)

    result = await db.execute(stmt)
    skills = result.scalars().all()

    # 总数
    count_stmt = select(func.count()).select_from(Skill).where(Skill.status == "active")
    if category_id:
        count_stmt = count_stmt.where(Skill.category_id == category_id)
    if skill_type:
        count_stmt = count_stmt.where(Skill.skill_type == skill_type)
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    return {
        "success": True,
        "data": {
            "items": [
                {
                    "id": str(s.id),
                    "name": s.name,
                    "slug": s.slug,
                    "description": s.description or "",
                    "skill_type": s.skill_type or "",
                    "tags": s.tags or [],
                    "platforms": s.platforms or [],
                    "author": s.author or "",
                    "icon_url": s.icon_url or "",
                    "quality_score": float(s.quality_score) if s.quality_score else 0,
                    "usage_count": s.usage_count or 0,
                    "favorite_count": s.favorite_count or 0,
                    "source": s.source or "",
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                }
                for s in skills
            ],
            "total": total,
            "page": page,
            "size": size,
            "sort_by": sort_by,
        },
    }
