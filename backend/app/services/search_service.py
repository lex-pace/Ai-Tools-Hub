"""AI Tools Hub — 搜索服务层"""
import logging
import uuid
from typing import Optional

from sqlalchemy import select, func, or_, case, String, text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tool import Tool
from app.models.search_log import SearchLog
from app.schemas.tool import ToolList
from app.schemas.common import PaginationOut

logger = logging.getLogger(__name__)


async def search_tools(
    db: AsyncSession,
    keyword: str,
    category_id: Optional[uuid.UUID] = None,
    tool_type: Optional[str] = None,
    sort: Optional[str] = None,
    page: int = 1,
    size: int = 20,
) -> tuple[list[ToolList], PaginationOut]:
    """
    关键词搜索工具

    优先使用 Elasticsearch 全文检索，ES 不可用时自动降级到 PostgreSQL LIKE 模糊匹配。
    搜索范围：name, description, detail, tags
    """
    tool_ids = None
    es_total = None

    # ── 尝试 ES 搜索 ─────────────────────────────────
    try:
        from app.services.es_service import get_tool_ids_by_query

        # 构建 ES 过滤参数
        es_filters = {}
        if tool_type:
            es_filters["tool_type"] = tool_type

        # 如果有 category_id，查询 category_slug 用于 ES 过滤
        if category_id is not None:
            from app.models.category import Category
            cat_stmt = select(Category.slug).where(Category.id == category_id)
            cat_result = await db.execute(cat_stmt)
            category_slug = cat_result.scalar_one_or_none()
            if category_slug:
                es_filters["category_slug"] = category_slug

        # 调用 ES 搜索
        tool_ids, es_total = await get_tool_ids_by_query(
            query=keyword,
            tool_type=tool_type,
            sort=sort,
            page=page,
            size=size,
        )
        logger.info(f"使用 ES 搜索: keyword='{keyword}', 匹配 {es_total} 条")

    except Exception as e:
        logger.warning(f"ES 搜索失败，降级到 PostgreSQL: {e}")
        tool_ids = None
        es_total = None

    # ── 用 ES 返回的 ID 从 PG 查完整数据 ──────────────
    if tool_ids is not None:
        if not tool_ids:
            # ES 搜索无结果，直接返回空
            return [], PaginationOut.create(page=page, size=size, total=0)

        # 使用 CASE 表达式保持 ES 返回的排序顺序
        # 构建 id -> position 映射
        id_order = {str(sid): idx for idx, sid in enumerate(tool_ids)}

        stmt = select(Tool).where(
            Tool.id.in_(tool_ids),
            Tool.status == "active",
        )

        # 按 ES 返回顺序排序
        order_case = case(
            *[
                (Tool.id == sid, idx)
                for sid, idx in id_order.items()
            ],
            else_=999999,
        )
        stmt = stmt.order_by(order_case)

        result = await db.execute(stmt)
        tools = result.scalars().all()

        items = [ToolList.model_validate(s) for s in tools]
        pagination = PaginationOut.create(page=page, size=size, total=es_total or 0)

        return items, pagination

    # ── 降级: PostgreSQL LIKE 模糊匹配 ───────────────
    logger.info(f"使用 PostgreSQL LIKE 搜索: keyword='{keyword}'")

    like_pattern = f"%{keyword}%"
    conditions = [
        Tool.name.ilike(like_pattern),
        Tool.description.ilike(like_pattern),
        # tags 是 JSONB 数组，用 func.cast 转为 text 后搜索
        func.cast(Tool.tags, String).ilike(like_pattern),
    ]

    stmt = select(Tool).where(
        Tool.status == "active",
        or_(*conditions),
    )

    # 附加过滤
    if category_id is not None:
        stmt = stmt.where(Tool.category_id == category_id)
    if tool_type is not None:
        stmt = stmt.where(Tool.tool_type == tool_type)

    # 计算总数
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # 排序
    sort_column = Tool.created_at.desc()
    if sort == "quality_score":
        sort_column = Tool.quality_score.desc()
    elif sort == "usage_count":
        sort_column = Tool.usage_count.desc()
    stmt = stmt.order_by(sort_column)

    # 分页
    offset = (page - 1) * size
    stmt = stmt.offset(offset).limit(size)

    result = await db.execute(stmt)
    tools = result.scalars().all()

    items = [ToolList.model_validate(s) for s in tools]
    pagination = PaginationOut.create(page=page, size=size, total=total)

    return items, pagination


async def log_search(
    db: AsyncSession,
    keyword: str,
    results_count: int,
    user_id: Optional[uuid.UUID] = None,
    ip_address: Optional[str] = None,
    filters: Optional[dict] = None,
) -> SearchLog:
    """记录搜索日志"""
    search_log = SearchLog(
        query=keyword,
        results_count=results_count,
        user_id=user_id,
        ip_address=ip_address,
        filters=filters or {},
    )
    db.add(search_log)
    await db.flush()
    return search_log


# ── 搜索历史 ──────────────────────────────────────────


async def save_search_history(
    db: AsyncSession,
    user_id: Optional[uuid.UUID],
    query: str,
    result_count: int = 0,
) -> None:
    """保存搜索历史

    已登录用户存数据库，未登录用户不保存（前端用 localStorage）。
    """
    if not query or not query.strip():
        return

    # 只为已登录用户保存到数据库
    if user_id:
        log = SearchLog(
            user_id=user_id,
            query=query.strip(),
            result_count=result_count,
        )
        db.add(log)
        # 不在这里 commit，由调用方统一 commit


async def get_search_history(
    db: AsyncSession,
    user_id: Optional[uuid.UUID],
    limit: int = 10,
) -> list[str]:
    """获取搜索历史

    已登录用户从数据库读取，未登录用户返回空列表（前端用 localStorage）。
    """
    if not user_id:
        return []

    from sqlalchemy import distinct

    stmt = (
        select(distinct(SearchLog.query))
        .where(SearchLog.user_id == user_id)
        .order_by(SearchLog.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]
