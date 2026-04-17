"""AI Skills Hub — 技能搜索/详情端点"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.auth import get_optional_user
from app.models.user import User
from app.models.favorite import Favorite
from app.models.review import Review
from app.schemas.skill import SkillList, SkillDetail
from app.schemas.common import ResponseBase, ResponseWithPagination
from app.services import skill_service

router = APIRouter()


@router.get("", response_model=ResponseWithPagination[SkillList], summary="技能分页列表")
async def get_skills(
    category_id: Optional[uuid.UUID] = Query(default=None, description="分类 ID 过滤"),
    skill_type: Optional[str] = Query(default=None, description="技能类型过滤"),
    sort: Optional[str] = Query(default=None, description="排序：quality_score / usage_count / created_at"),
    page: int = Query(default=1, ge=1, description="页码"),
    size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
):
    """
    获取技能分页列表

    支持按分类、类型过滤，支持多种排序方式
    """
    items, pagination = await skill_service.get_skills_list(
        db,
        category_id=category_id,
        skill_type=skill_type,
        sort=sort,
        page=page,
        size=size,
    )
    return ResponseWithPagination(data=items, pagination=pagination)


@router.get("/{skill_id}", response_model=ResponseBase[SkillDetail], summary="技能详情")
async def get_skill(
    skill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    根据 ID 获取技能详情

    - 如果用户已登录，返回是否已收藏
    - 始终返回平均评分和评价数量
    """
    skill = await skill_service.get_skill_by_id(db, skill_id)
    if skill is None:
        raise HTTPException(status_code=404, detail="技能不存在")

    # 转为字典以便添加额外字段
    skill_dict = skill.model_dump()

    # 查询平均评分和评价数量
    rating_stmt = select(
        func.coalesce(func.avg(Review.rating), None),
        func.count(Review.id),
    ).where(Review.skill_id == skill_id)
    rating_result = await db.execute(rating_stmt)
    avg_rating, review_count = rating_result.one()
    skill_dict["avg_rating"] = round(float(avg_rating), 1) if avg_rating is not None else None
    skill_dict["review_count"] = review_count or 0

    # 如果用户已登录，检查是否已收藏
    is_favorited = False
    if current_user is not None:
        fav_stmt = select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.skill_id == skill_id,
        )
        fav_result = await db.execute(fav_stmt)
        is_favorited = fav_result.scalar_one_or_none() is not None
    skill_dict["is_favorited"] = is_favorited

    return ResponseBase(data=SkillDetail(**skill_dict))
