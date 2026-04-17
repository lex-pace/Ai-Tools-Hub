"""智能推荐服务 — 基于 LLM 理解用户意图并推荐 Tools

流程：
1. 调用 LLM 分析用户意图，提取关键词、工具类型、分类等
2. 用提取的关键词搜索 Tools（优先 ES，降级 PG）
3. 返回推荐结果 + LLM 推荐理由
"""
import json
import logging
import re
from typing import Optional

from sqlalchemy import select, func, or_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tool import Tool
from app.models.category import Category
from app.schemas.tool import ToolList
from app.schemas.common import PaginationOut
from app.services.llm_service import get_llm_service

logger = logging.getLogger(__name__)

# ── 推荐系统提示词 ──────────────────────────────────────────────────

RECOMMEND_SYSTEM_PROMPT = """你是一个 AI Tools 推荐专家。用户会描述他们的需求，你需要：
1. 理解用户的需求场景
2. 提取关键搜索词（英文，用于搜索匹配）
3. 推荐最合适的工具类型（mcp_server/custom_gpt/agent_tool/prompt_template）
4. 给出推荐理由

请以 JSON 格式回复：
{
    "keywords": ["关键词1", "关键词2", "关键词3"],
    "tool_types": ["mcp_server", "agent_tool"],
    "category_slugs": ["programming", "data-analysis"],
    "reasoning": "用户需要一个能...",
    "suggested_query": "推荐的搜索词"
}

只返回 JSON，不要其他内容。"""


async def smart_recommend(
    db: AsyncSession,
    user_query: str,
    page: int = 1,
    size: int = 10,
) -> dict:
    """
    智能推荐入口

    1. 调用 LLM 分析用户意图
    2. 用提取的关键词搜索 Tools（优先 ES，降级 PG）
    3. 返回推荐结果 + LLM 推荐理由

    返回:
    {
        "reasoning": "LLM 推荐理由",
        "keywords": ["关键词列表"],
        "suggested_query": "建议搜索词",
        "data": [ToolList...],
        "pagination": PaginationOut
    }
    """
    # 默认降级结果
    default_result = {
        "reasoning": "",
        "keywords": [],
        "suggested_query": user_query,
        "data": [],
        "pagination": PaginationOut.create(page=page, size=size, total=0),
    }

    # ── 第一步：调用 LLM 分析用户意图 ─────────────────
    intent = await _analyze_intent(user_query)

    if intent is None:
        # LLM 分析失败，降级为直接用用户原始查询搜索
        logger.warning("LLM 意图分析失败，降级为直接搜索")
        items, pagination = await _search_by_keywords(
            db=db,
            keywords=[user_query],
            tool_types=None,
            category_slugs=None,
            page=page,
            size=size,
        )
        default_result["reasoning"] = "AI 分析暂时不可用，已为您进行关键词搜索。"
        default_result["keywords"] = [user_query]
        default_result["suggested_query"] = user_query
        default_result["data"] = items
        default_result["pagination"] = pagination
        return default_result

    keywords = intent.get("keywords", [])
    tool_types = intent.get("tool_types", [])
    category_slugs = intent.get("category_slugs", [])
    reasoning = intent.get("reasoning", "")
    suggested_query = intent.get("suggested_query", user_query)

    # 如果 LLM 没有提取到关键词，使用 suggested_query 作为搜索词
    if not keywords:
        keywords = [suggested_query] if suggested_query else [user_query]

    logger.info(
        f"LLM 意图分析完成: keywords={keywords}, "
        f"tool_types={tool_types}, category_slugs={category_slugs}"
    )

    # ── 第二步：根据关键词搜索 Tools ─────────────────
    items, pagination = await _search_by_keywords(
        db=db,
        keywords=keywords,
        tool_types=tool_types if tool_types else None,
        category_slugs=category_slugs if category_slugs else None,
        page=page,
        size=size,
    )

    return {
        "reasoning": reasoning,
        "keywords": keywords,
        "suggested_query": suggested_query,
        "data": items,
        "pagination": pagination,
    }


async def _analyze_intent(user_query: str) -> Optional[dict]:
    """
    调用 LLM 分析用户意图

    - 发送用户查询给 LLM
    - 解析 JSON 响应
    - 失败时返回 None（降级为直接搜索）
    """
    try:
        llm = await get_llm_service()

        messages = [
            {"role": "system", "content": RECOMMEND_SYSTEM_PROMPT},
            {"role": "user", "content": user_query},
        ]

        response = await llm.chat(
            messages=messages,
            temperature=0.3,  # 低温度，确保输出稳定
            max_tokens=500,
        )

        content = response.content.strip()

        # 尝试从 LLM 响应中提取 JSON
        # LLM 可能会在 JSON 前后添加 markdown 代码块标记
        json_str = _extract_json(content)
        if json_str is None:
            logger.warning(f"LLM 响应中未找到有效 JSON: {content[:200]}")
            return None

        intent = json.loads(json_str)

        # 验证必要字段
        if not isinstance(intent, dict):
            logger.warning(f"LLM 返回的不是 JSON 对象: {type(intent)}")
            return None

        # 确保关键字段存在
        intent.setdefault("keywords", [])
        intent.setdefault("tool_types", [])
        intent.setdefault("category_slugs", [])
        intent.setdefault("reasoning", "")
        intent.setdefault("suggested_query", user_query)

        return intent

    except json.JSONDecodeError as e:
        logger.warning(f"LLM 响应 JSON 解析失败: {e}")
        return None
    except Exception as e:
        logger.error(f"LLM 意图分析异常: {e}")
        return None


def _extract_json(text: str) -> Optional[str]:
    """
    从 LLM 响应文本中提取 JSON 字符串

    支持以下格式：
    1. 纯 JSON 文本
    2. ```json ... ``` 代码块
    3. ``` ... ``` 代码块
    """
    # 尝试匹配 markdown 代码块中的 JSON
    code_block_pattern = r"```(?:json)?\s*\n?(.*?)\n?\s*```"
    match = re.search(code_block_pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()

    # 尝试匹配花括号包裹的 JSON 对象
    brace_pattern = r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}"
    match = re.search(brace_pattern, text, re.DOTALL)
    if match:
        return match.group(0).strip()

    return None


async def _search_by_keywords(
    db: AsyncSession,
    keywords: list[str],
    tool_types: Optional[list[str]] = None,
    category_slugs: Optional[list[str]] = None,
    page: int = 1,
    size: int = 10,
) -> tuple[list[ToolList], PaginationOut]:
    """
    根据 LLM 提取的关键词搜索 Tools

    - 优先使用 ES 搜索（OR 组合多个关键词）
    - ES 不可用时降级到 PostgreSQL LIKE 模糊匹配
    - 可选按 tool_type 和 category 过滤
    - 返回 (items, pagination)
    """
    if not keywords:
        return [], PaginationOut.create(page=page, size=size, total=0)

    # 将多个关键词用 OR 组合成一个搜索字符串
    combined_query = " OR ".join(keywords)

    # ── 尝试 ES 搜索 ─────────────────────────────────
    try:
        from app.services.es_service import get_tool_ids_by_query

        # 构建 ES 过滤参数
        es_filters = {}
        if tool_types and len(tool_types) == 1:
            es_filters["tool_type"] = tool_types[0]
        if category_slugs and len(category_slugs) == 1:
            es_filters["category_slug"] = category_slugs[0]

        tool_ids, es_total = await get_tool_ids_by_query(
            query=combined_query,
            tool_type=es_filters.get("tool_type"),
            sort="quality_score",
            page=page,
            size=size,
        )

        if tool_ids is not None:
            if not tool_ids:
                return [], PaginationOut.create(page=page, size=size, total=0)

            # 用 ES 返回的 ID 从 PG 查完整数据
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

            logger.info(f"ES 智能推荐搜索: query='{combined_query}', 匹配 {es_total} 条")
            return items, pagination

    except Exception as e:
        logger.warning(f"ES 搜索失败，降级到 PostgreSQL: {e}")

    # ── 降级: PostgreSQL LIKE 模糊匹配 ───────────────
    logger.info(f"PostgreSQL LIKE 智能推荐搜索: keywords={keywords}")

    # 用 OR 组合多个关键词的 LIKE 条件
    conditions = []
    for keyword in keywords:
        like_pattern = f"%{keyword}%"
        conditions.extend([
            Tool.name.ilike(like_pattern),
            Tool.description.ilike(like_pattern),
            Tool.tags.cast(str).ilike(like_pattern),
        ])

    stmt = select(Tool).where(
        Tool.status == "active",
        or_(*conditions),
    )

    # 按 tool_type 过滤
    if tool_types:
        stmt = stmt.where(Tool.tool_type.in_(tool_types))

    # 按 category 过滤（需要先查 category_id）
    if category_slugs:
        cat_stmt = select(Category.id).where(Category.slug.in_(category_slugs))
        cat_result = await db.execute(cat_stmt)
        cat_ids = cat_result.scalars().all()
        if cat_ids:
            stmt = stmt.where(Tool.category_id.in_(cat_ids))

    # 计算总数
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # 排序（优先按质量评分）
    stmt = stmt.order_by(Tool.quality_score.desc())

    # 分页
    offset = (page - 1) * size
    stmt = stmt.offset(offset).limit(size)

    result = await db.execute(stmt)
    tools = result.scalars().all()

    items = [ToolList.model_validate(s) for s in tools]
    pagination = PaginationOut.create(page=page, size=size, total=total)

    return items, pagination
