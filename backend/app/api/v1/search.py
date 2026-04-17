"""AI Skills Hub — 智能搜索端点"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.auth import get_optional_user
from app.models.skill import Skill
from app.models.user import User
from app.schemas.skill import SkillList
from app.schemas.common import ResponseWithPagination
from app.services import search_service

router = APIRouter()


@router.get("", response_model=ResponseWithPagination[SkillList], summary="关键词搜索")
async def search_skills(
    q: str = Query(..., min_length=1, max_length=200, description="搜索关键词"),
    category_id: Optional[uuid.UUID] = Query(default=None, description="分类 ID 过滤"),
    skill_type: Optional[str] = Query(default=None, description="技能类型过滤"),
    sort: Optional[str] = Query(default=None, description="排序方式"),
    page: int = Query(default=1, ge=1, description="页码"),
    size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """
    关键词搜索技能

    优先使用 Elasticsearch 全文检索（IK 中文分词），ES 不可用时自动降级到 PostgreSQL LIKE 模糊匹配。
    搜索范围：技能名称、描述、详情、标签
    """
    items, pagination = await search_service.search_skills(
        db,
        keyword=q,
        category_id=category_id,
        skill_type=skill_type,
        sort=sort,
        page=page,
        size=size,
    )

    # 异步记录搜索日志（不影响响应）
    try:
        client_ip = request.client.host if request and request.client else None
        await search_service.log_search(
            db,
            keyword=q,
            results_count=pagination.total,
            ip_address=client_ip,
        )
    except Exception:
        # 搜索日志记录失败不影响搜索结果
        pass

    return ResponseWithPagination(data=items, pagination=pagination)


@router.post("/sync", summary="同步数据到 Elasticsearch")
async def sync_to_elasticsearch(db: AsyncSession = Depends(get_db)):
    """
    将所有活跃技能同步到 ES 索引（管理接口）

    会先确保索引存在，再批量索引所有 status='active' 的技能。
    """
    from app.services.es_service import ensure_skills_index, bulk_index_skills

    # 确保索引存在
    index_ok = await ensure_skills_index()
    if not index_ok:
        return {"message": "ES 索引创建失败，请检查 ES 服务状态", "success": False}

    # 查询所有活跃技能
    stmt = select(Skill).where(Skill.status == "active")
    result = await db.execute(stmt)
    skills = result.scalars().all()

    # 批量索引到 ES
    count = await bulk_index_skills(skills)

    return {
        "message": f"已同步 {count} 条技能到 ES",
        "success": True,
        "total_active": len(skills),
        "indexed": count,
    }


@router.get("/suggest", summary="搜索建议")
async def search_suggest(
    q: str = Query(default="", min_length=1, description="搜索前缀"),
    size: int = Query(default=10, ge=1, le=20, description="返回数量"),
):
    """搜索建议 — 输入时实时返回匹配的 Skill 名称

    基于 ES Completion Suggester，输入 1 个字符即可返回建议。
    """
    from app.services.es_service import suggest_skills

    suggestions = await suggest_skills(q, size)
    return {"success": True, "data": suggestions}


@router.get("/history", summary="搜索历史")
async def search_history(
    limit: int = Query(default=10, ge=1, le=50, description="返回数量"),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    """获取搜索历史

    已登录用户从数据库读取，未登录用户返回空列表（前端使用 localStorage）。
    """
    from app.services.search_service import get_search_history

    user_id = user.id if user else None
    history = await get_search_history(db, user_id, limit)
    return {"success": True, "data": history}
