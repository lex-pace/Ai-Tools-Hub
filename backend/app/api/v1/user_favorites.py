"""用户收藏 API（需登录）"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.favorite import Favorite
from app.models.tool import Tool
from app.schemas.common import ResponseBase, ResponseWithPagination, PaginationOut
from app.schemas.tool import ToolList

router = APIRouter()


@router.get("/check/{tool_id}", response_model=ResponseBase[dict], summary="检查是否已收藏")
async def check_favorite(
    tool_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    检查当前用户是否已收藏指定工具

    - 需要登录
    """
    stmt = select(Favorite).where(
        Favorite.user_id == current_user.id,
        Favorite.tool_id == tool_id,
    )
    result = await db.execute(stmt)
    is_favorited = result.scalar_one_or_none() is not None

    return ResponseBase(data={"is_favorited": is_favorited})


@router.get("", response_model=ResponseWithPagination[ToolList], summary="获取我的收藏列表")
async def get_my_favorites(
    page: int = Query(default=1, ge=1, description="页码"),
    size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    获取当前用户的收藏列表（分页）

    - 需要登录
    - 返回收藏的工具列表
    """
    # 基础查询
    stmt = (
        select(Tool)
        .join(Favorite, Favorite.tool_id == Tool.id)
        .where(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc())
    )

    # 计算总数
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # 分页
    offset = (page - 1) * size
    stmt = stmt.offset(offset).limit(size)

    result = await db.execute(stmt)
    tools = result.scalars().all()

    items = [ToolList.model_validate(s) for s in tools]
    pagination = PaginationOut.create(page=page, size=size, total=total)

    return ResponseWithPagination(data=items, pagination=pagination)


@router.post("/{tool_id}", response_model=ResponseBase, summary="添加收藏")
async def add_favorite(
    tool_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    收藏一个工具

    - 需要登录
    - 如果已收藏则返回提示
    """
    # 检查工具是否存在
    tool_stmt = select(Tool).where(Tool.id == tool_id)
    tool_result = await db.execute(tool_stmt)
    tool = tool_result.scalar_one_or_none()
    if tool is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="工具不存在")

    # 检查是否已收藏
    fav_stmt = select(Favorite).where(
        Favorite.user_id == current_user.id,
        Favorite.tool_id == tool_id,
    )
    fav_result = await db.execute(fav_stmt)
    if fav_result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="已收藏该工具")

    # 创建收藏
    favorite = Favorite(user_id=current_user.id, tool_id=tool_id)
    db.add(favorite)

    # 更新工具收藏计数
    tool.favorite_count = (tool.favorite_count or 0) + 1

    await db.commit()
    return ResponseBase(data=None, message="收藏成功")


@router.delete("/{tool_id}", response_model=ResponseBase, summary="取消收藏")
async def remove_favorite(
    tool_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    取消收藏一个工具

    - 需要登录
    """
    # 查找收藏记录
    fav_stmt = select(Favorite).where(
        Favorite.user_id == current_user.id,
        Favorite.tool_id == tool_id,
    )
    fav_result = await db.execute(fav_stmt)
    favorite = fav_result.scalar_one_or_none()

    if favorite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未收藏该工具")

    await db.delete(favorite)

    # 更新工具收藏计数（确保不低于 0）
    tool_stmt = select(Tool).where(Tool.id == tool_id)
    tool_result = await db.execute(tool_stmt)
    tool = tool_result.scalar_one_or_none()
    if tool and tool.favorite_count and tool.favorite_count > 0:
        tool.favorite_count -= 1

    await db.commit()
    return ResponseBase(data=None, message="取消收藏成功")
