"""AI Tools Hub — 分类 CRUD 端点"""
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.exceptions import NotFoundError
from app.schemas.category import CategoryOut, CategoryTree
from app.schemas.common import ResponseBase
from app.services import category_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=ResponseBase[CategoryTree], summary="获取分类树")
async def get_categories(
    parent_id: Optional[uuid.UUID] = Query(default=None, description="父分类 ID，不传则返回完整树"),
    db: AsyncSession = Depends(get_db),
):
    """
    获取分类树

    - 不传 parent_id：返回所有一级分类及其子分类
    - 传入 parent_id：返回该分类下的子分类
    """
    try:
        tree = await category_service.get_category_tree(db, parent_id=parent_id)
    except Exception as e:
        logger.error("获取分类树失败: %s", e, exc_info=True)
        raise

    return ResponseBase(data=tree)


@router.get("/{category_id}", response_model=ResponseBase[CategoryOut], summary="获取单个分类")
async def get_category(
    category_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """根据 ID 获取单个分类详情"""
    try:
        category = await category_service.get_category_by_id(db, category_id)
    except Exception as e:
        logger.error("查询分类详情失败: category_id=%s, error=%s", category_id, e, exc_info=True)
        raise

    if category is None:
        raise NotFoundError("Category", str(category_id))

    return ResponseBase(data=category)
