"""用户评价 API（需登录）"""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.review import Review
from app.models.skill import Skill
from app.schemas.common import ResponseBase, ResponseWithPagination, PaginationOut
from app.schemas.user import UserOut

router = APIRouter()


class ReviewOut(BaseModel):
    """评价输出"""
    id: uuid.UUID
    user: UserOut
    skill_id: uuid.UUID
    rating: int
    comment: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ReviewCreate(BaseModel):
    """创建评价"""
    rating: int = Field(..., ge=1, le=5, description="评分 1~5")
    comment: Optional[str] = None


class ReviewUpdate(BaseModel):
    """更新评价"""
    rating: Optional[int] = Field(default=None, ge=1, le=5, description="评分 1~5")
    comment: Optional[str] = None


@router.get(
    "/{skill_id}/reviews",
    response_model=ResponseWithPagination[ReviewOut],
    summary="获取技能的评价列表",
)
async def get_reviews(
    skill_id: uuid.UUID,
    page: int = Query(default=1, ge=1, description="页码"),
    size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
):
    """
    获取指定技能的评价列表（分页）

    - 不需要登录
    """
    # 检查技能是否存在
    skill_stmt = select(Skill).where(Skill.id == skill_id)
    skill_result = await db.execute(skill_stmt)
    if skill_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="技能不存在")

    # 查询评价
    stmt = (
        select(Review)
        .where(Review.skill_id == skill_id)
        .order_by(Review.created_at.desc())
    )

    # 计算总数
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # 分页
    offset = (page - 1) * size
    stmt = stmt.offset(offset).limit(size)

    result = await db.execute(stmt)
    reviews = result.scalars().all()

    items = [
        ReviewOut(
            id=r.id,
            user=UserOut.model_validate(r.user),
            skill_id=r.skill_id,
            rating=r.rating,
            comment=r.comment,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in reviews
    ]
    pagination = PaginationOut.create(page=page, size=size, total=total)

    return ResponseWithPagination(data=items, pagination=pagination)


@router.post(
    "/{skill_id}/reviews",
    response_model=ResponseBase[ReviewOut],
    summary="发表评价",
)
async def create_review(
    skill_id: uuid.UUID,
    rating: int = Query(..., ge=1, le=5, description="评分 1~5"),
    comment: Optional[str] = Query(default=None, description="评论内容"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    对技能发表评价

    - 需要登录
    - 每个用户每个技能只能评价一次
    """
    # 检查技能是否存在
    skill_stmt = select(Skill).where(Skill.id == skill_id)
    skill_result = await db.execute(skill_stmt)
    if skill_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="技能不存在")

    # 检查是否已评价
    existing_stmt = select(Review).where(
        Review.user_id == current_user.id,
        Review.skill_id == skill_id,
    )
    existing_result = await db.execute(existing_stmt)
    if existing_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="您已评价过该技能，请使用修改接口更新评价",
        )

    # 创建评价
    review = Review(
        user_id=current_user.id,
        skill_id=skill_id,
        rating=rating,
        comment=comment,
    )
    db.add(review)
    await db.flush()
    await db.refresh(review)

    await db.commit()

    return ResponseBase(
        data=ReviewOut(
            id=review.id,
            user=UserOut.model_validate(current_user),
            skill_id=review.skill_id,
            rating=review.rating,
            comment=review.comment,
            created_at=review.created_at,
            updated_at=review.updated_at,
        ),
        message="评价发表成功",
    )


@router.put(
    "/{skill_id}/reviews",
    response_model=ResponseBase[ReviewOut],
    summary="修改评价",
)
async def update_review(
    skill_id: uuid.UUID,
    rating: Optional[int] = Query(default=None, ge=1, le=5, description="评分 1~5"),
    comment: Optional[str] = Query(default=None, description="评论内容"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    修改对技能的评价

    - 需要登录
    - 只能修改自己的评价
    """
    # 查找已有评价
    stmt = select(Review).where(
        Review.user_id == current_user.id,
        Review.skill_id == skill_id,
    )
    result = await db.execute(stmt)
    review = result.scalar_one_or_none()

    if review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到您的评价，请先发表评价",
        )

    # 更新字段
    if rating is not None:
        review.rating = rating
    if comment is not None:
        review.comment = comment

    review.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(review)

    await db.commit()

    return ResponseBase(
        data=ReviewOut(
            id=review.id,
            user=UserOut.model_validate(current_user),
            skill_id=review.skill_id,
            rating=review.rating,
            comment=review.comment,
            created_at=review.created_at,
            updated_at=review.updated_at,
        ),
        message="评价修改成功",
    )


@router.delete(
    "/{skill_id}/reviews",
    response_model=ResponseBase,
    summary="删除评价",
)
async def delete_review(
    skill_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    删除对技能的评价

    - 需要登录
    - 只能删除自己的评价
    """
    # 查找已有评价
    stmt = select(Review).where(
        Review.user_id == current_user.id,
        Review.skill_id == skill_id,
    )
    result = await db.execute(stmt)
    review = result.scalar_one_or_none()

    if review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到您的评价",
        )

    await db.delete(review)
    await db.commit()

    return ResponseBase(data=None, message="评价删除成功")
