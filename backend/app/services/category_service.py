"""AI Skills Hub — 分类服务层"""
import uuid
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.category import Category
from app.models.skill import Skill
from app.schemas.category import CategoryOut, CategoryTree


def _category_to_dict(cat) -> dict:
    """安全地将 Category ORM 对象转为 dict（避免 model_validate 的递归问题）"""
    return {
        "id": cat.id,
        "name": cat.name,
        "slug": cat.slug,
        "description": cat.description,
        "parent_id": cat.parent_id,
        "level": cat.level,
        "icon": cat.icon,
        "sort_order": cat.sort_order,
        "is_active": cat.is_active,
        "created_at": cat.created_at,
        "updated_at": cat.updated_at,
        "skill_count": 0,
        "children": [],
    }


async def _count_skills_for_categories(
    db: AsyncSession, category_ids: list
) -> dict:
    """批量统计每个分类下的活跃技能数量"""
    if not category_ids:
        return {}
    stmt = (
        select(Skill.category_id, func.count(Skill.id))
        .where(Skill.category_id.in_(category_ids), Skill.status == "active")
        .group_by(Skill.category_id)
    )
    result = await db.execute(stmt)
    return {row[0]: row[1] for row in result.all()}


async def get_category_tree(
    db: AsyncSession,
    parent_id: Optional[uuid.UUID] = None,
) -> CategoryTree:
    if parent_id is None:
        stmt = (
            select(Category)
            .options(selectinload(Category.children))
            .where(Category.parent_id.is_(None), Category.is_active.is_(True))
            .order_by(Category.sort_order)
        )
        result = await db.execute(stmt)
        top_categories = result.scalars().unique().all()

        all_cat_ids = [c.id for c in top_categories]
        for c in top_categories:
            all_cat_ids.extend([ch.id for ch in c.children])
        count_map = await _count_skills_for_categories(db, all_cat_ids)

        items = []
        for cat in top_categories:
            cat_dict = _category_to_dict(cat)
            # 一级分类的 skill_count = 自身 + 所有子分类
            parent_count = count_map.get(cat.id, 0)
            children_count = sum(count_map.get(ch.id, 0) for ch in cat.children)
            cat_dict["skill_count"] = parent_count + children_count
            cat_dict["children"] = []
            for ch in cat.children:
                ch_dict = _category_to_dict(ch)
                ch_dict["skill_count"] = count_map.get(ch.id, 0)
                cat_dict["children"].append(CategoryOut(**ch_dict))
            items.append(CategoryOut(**cat_dict))
    else:
        stmt = (
            select(Category)
            .where(Category.parent_id == parent_id, Category.is_active.is_(True))
            .order_by(Category.sort_order)
        )
        result = await db.execute(stmt)
        categories = result.scalars().all()

        cat_ids = [c.id for c in categories]
        count_map = await _count_skills_for_categories(db, cat_ids)

        items = []
        for c in categories:
            c_dict = _category_to_dict(c)
            c_dict["skill_count"] = count_map.get(c.id, 0)
            items.append(CategoryOut(**c_dict))

    return CategoryTree(items=items)


async def get_category_by_id(
    db: AsyncSession,
    category_id: uuid.UUID,
) -> Optional[CategoryOut]:
    stmt = (
        select(Category)
        .options(selectinload(Category.children))
        .where(Category.id == category_id)
    )
    result = await db.execute(stmt)
    category = result.scalar_one_or_none()
    if category is None:
        return None

    count_map = await _count_skills_for_categories(db, [category_id])
    cat_dict = _category_to_dict(category)
    cat_dict["skill_count"] = count_map.get(category_id, 0)
    if category.children:
        child_ids = [ch.id for ch in category.children]
        child_counts = await _count_skills_for_categories(db, child_ids)
        cat_dict["children"] = []
        for ch in category.children:
            ch_dict = _category_to_dict(ch)
            ch_dict["skill_count"] = child_counts.get(ch.id, 0)
            cat_dict["children"].append(CategoryOut(**ch_dict))
    return CategoryOut(**cat_dict)


async def get_category_by_slug(
    db: AsyncSession,
    slug: str,
) -> Optional[CategoryOut]:
    """根据 slug 获取单个分类"""
    stmt = (
        select(Category)
        .options(selectinload(Category.children))
        .where(Category.slug == slug)
    )
    result = await db.execute(stmt)
    category = result.scalar_one_or_none()
    if category is None:
        return None
    return CategoryOut.model_validate(category)
