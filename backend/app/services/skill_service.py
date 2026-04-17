"""AI Skills Hub — 技能服务层"""
import uuid
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.skill import Skill
from app.models.category import Category
from app.schemas.skill import SkillList, SkillDetail
from app.schemas.common import PaginationOut


async def _get_category_ids_with_children(
    db: AsyncSession, category_id: uuid.UUID
) -> list:
    """获取分类 ID 及其所有子分类 ID（支持一级分类查所有子分类下的技能）"""
    # 查询该分类的所有子分类 ID
    child_stmt = select(Category.id).where(Category.parent_id == category_id, Category.is_active.is_(True))
    child_result = await db.execute(child_stmt)
    child_ids = [row[0] for row in child_result.all()]
    return [category_id] + child_ids


async def get_skills_list(
    db: AsyncSession,
    category_id: Optional[uuid.UUID] = None,
    skill_type: Optional[str] = None,
    sort: Optional[str] = None,
    page: int = 1,
    size: int = 20,
) -> tuple[list[SkillList], PaginationOut]:
    """
    获取技能分页列表

    支持按分类、类型过滤和排序
    返回 (技能列表, 分页信息)
    """
    # 基础查询：只查活跃状态
    stmt = select(Skill).where(Skill.status == "active")

    # 过滤条件
    if category_id is not None:
        # 获取该分类及所有子分类的 ID
        all_cat_ids = await _get_category_ids_with_children(db, category_id)
        stmt = stmt.where(Skill.category_id.in_(all_cat_ids))
    if skill_type is not None:
        stmt = stmt.where(Skill.skill_type == skill_type)

    # 计算总数
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # 排序
    sort_column = Skill.created_at.desc()  # 默认按创建时间倒序
    if sort == "quality_score":
        sort_column = Skill.quality_score.desc()
    elif sort == "usage_count":
        sort_column = Skill.usage_count.desc()
    elif sort == "favorite_count":
        sort_column = Skill.favorite_count.desc()
    stmt = stmt.order_by(sort_column)

    # 分页
    offset = (page - 1) * size
    stmt = stmt.offset(offset).limit(size)

    result = await db.execute(stmt)
    skills = result.scalars().all()

    # 转换为 Schema
    items = [SkillList.model_validate(s) for s in skills]
    pagination = PaginationOut.create(page=page, size=size, total=total)

    return items, pagination


async def get_skill_by_id(
    db: AsyncSession,
    skill_id: uuid.UUID,
) -> Optional[SkillDetail]:
    """根据 ID 获取技能详情"""
    stmt = select(Skill).where(Skill.id == skill_id)
    result = await db.execute(stmt)
    skill = result.scalar_one_or_none()
    if skill is None:
        return None
    return SkillDetail.model_validate(skill)


async def get_skill_by_slug(
    db: AsyncSession,
    slug: str,
) -> Optional[SkillDetail]:
    """根据 slug 获取技能详情"""
    stmt = select(Skill).where(Skill.slug == slug)
    result = await db.execute(stmt)
    skill = result.scalar_one_or_none()
    if skill is None:
        return None
    return SkillDetail.model_validate(skill)
