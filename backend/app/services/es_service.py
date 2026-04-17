"""AI Skills Hub — Elasticsearch 搜索服务

提供技能索引管理与全文检索功能，使用 IK 中文分词器。
所有操作均使用 try/except 包裹，ES 不可用时不影响主流程。
"""
import logging
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from elasticsearch.helpers import async_bulk

from app.core.elasticsearch import get_es_client

logger = logging.getLogger(__name__)

# ── 索引名称 ──────────────────────────────────────────
SKILLS_INDEX = "skills"

# ── 索引 mapping 定义 ─────────────────────────────────
SKILLS_MAPPING = {
    "mappings": {
        "properties": {
            "id": {"type": "keyword"},
            "name": {
                "type": "text",
                "analyzer": "ik_max_word",
                "search_analyzer": "ik_smart",
            },
            "name_suggest": {
                "type": "completion",
            },
            "description": {
                "type": "text",
                "analyzer": "ik_max_word",
                "search_analyzer": "ik_smart",
            },
            "detail": {
                "type": "text",
                "analyzer": "ik_max_word",
                "search_analyzer": "ik_smart",
            },
            "tags": {"type": "keyword"},
            "skill_type": {"type": "keyword"},
            "category_slug": {"type": "keyword"},
            "author": {"type": "keyword"},
            "platforms": {"type": "keyword"},
            "quality_score": {"type": "float"},
            "usage_count": {"type": "integer"},
            "favorite_count": {"type": "integer"},
            "is_featured": {"type": "boolean"},
            "status": {"type": "keyword"},
            "created_at": {"type": "date"},
        }
    },
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
        "analysis": {
            "analyzer": {
                "ik_smart_analyzer": {
                    "type": "custom",
                    "tokenizer": "ik_smart",
                },
                "ik_max_word_analyzer": {
                    "type": "custom",
                    "tokenizer": "ik_max_word",
                },
            }
        },
    },
}


def _skill_to_doc(skill: Any) -> dict:
    """将 Skill ORM 对象转换为 ES 文档字典"""
    return {
        "id": str(skill.id),
        "name": skill.name or "",
        "name_suggest": skill.name or "",
        "description": skill.description or "",
        "detail": skill.detail or "",
        "tags": skill.tags if isinstance(skill.tags, list) else [],
        "skill_type": skill.skill_type or "",
        "category_slug": skill.category.slug if skill.category else "",
        "author": skill.author or "",
        "platforms": skill.platforms if isinstance(skill.platforms, list) else [],
        "quality_score": float(skill.quality_score) if skill.quality_score is not None else 0.0,
        "usage_count": skill.usage_count or 0,
        "favorite_count": skill.favorite_count or 0,
        "is_featured": skill.is_featured or False,
        "status": skill.status or "active",
        "created_at": skill.created_at.isoformat() if skill.created_at else datetime.utcnow().isoformat(),
    }


# ── 索引管理 ──────────────────────────────────────────


async def ensure_skills_index() -> bool:
    """
    确保 skills 索引存在且 mapping 正确，不存在或 mapping 不匹配则删除重建。

    Returns:
        True 表示索引已就绪，False 表示失败
    """
    try:
        es = await get_es_client()
        exists = await es.indices.exists(index=SKILLS_INDEX)
        if exists:
            # 检查 name_suggest 字段类型是否正确
            try:
                mapping = await es.indices.get_mapping(index=SKILLS_INDEX)
                props = mapping[SKILLS_INDEX]["mappings"].get("properties", {})
                suggest_type = props.get("name_suggest", {}).get("type", "")
                if suggest_type != "completion":
                    logger.warning(f"ES 索引 [{SKILLS_INDEX}] name_suggest 类型为 {suggest_type}，需要重建")
                    await es.indices.delete(index=SKILLS_INDEX)
                    exists = False
            except Exception:
                # 获取 mapping 失败，删除重建
                await es.indices.delete(index=SKILLS_INDEX)
                exists = False

        if not exists:
            await es.indices.create(index=SKILLS_INDEX, body=SKILLS_MAPPING)
            logger.info(f"ES 索引 [{SKILLS_INDEX}] 创建成功")
        else:
            logger.debug(f"ES 索引 [{SKILLS_INDEX}] 已存在且 mapping 正确")
        return True
    except Exception as e:
        logger.error(f"ES 确保索引失败: {e}")
        return False


# ── 单条索引 ──────────────────────────────────────────


async def index_skill(skill_dict: dict) -> bool:
    """
    索引单个技能文档

    Args:
        skill_dict: 包含所有字段的字典，必须包含 'id' 键

    Returns:
        True 表示成功，False 表示失败
    """
    try:
        es = await get_es_client()
        skill_id = skill_dict.pop("id", None)
        if skill_id is None:
            logger.warning("index_skill: 缺少 id 字段，跳过")
            return False
        await es.index(index=SKILLS_INDEX, id=str(skill_id), body=skill_dict)
        logger.debug(f"ES 索引技能成功: {skill_id}")
        return True
    except Exception as e:
        logger.error(f"ES 索引技能失败: {e}")
        return False


# ── 批量索引 ──────────────────────────────────────────


async def bulk_index_skills(skills_list: list) -> int:
    """
    批量索引技能（接收 Skill 模型对象列表）

    Args:
        skills_list: Skill ORM 对象列表

    Returns:
        成功索引的数量
    """
    if not skills_list:
        return 0

    try:
        es = await get_es_client()

        # 构建批量操作列表
        actions = []
        for skill in skills_list:
            doc = _skill_to_doc(skill)
            skill_id = doc.pop("id")
            actions.append({
                "_index": SKILLS_INDEX,
                "_id": skill_id,
                "_source": doc,
            })

        # 执行批量索引
        success, errors = await async_bulk(es, actions, raise_on_error=False)

        if errors:
            logger.warning(f"ES 批量索引部分失败: {len(errors)} 条出错")
        else:
            logger.info(f"ES 批量索引完成: {success} 条")

        return success
    except Exception as e:
        logger.error(f"ES 批量索引失败: {e}")
        return 0


# ── 删除索引 ──────────────────────────────────────────


async def delete_skill(skill_id: uuid.UUID) -> bool:
    """
    从 ES 索引中删除单个技能

    Args:
        skill_id: 技能 UUID

    Returns:
        True 表示成功，False 表示失败
    """
    try:
        es = await get_es_client()
        await es.delete(index=SKILLS_INDEX, id=str(skill_id))
        logger.debug(f"ES 删除技能成功: {skill_id}")
        return True
    except Exception as e:
        logger.error(f"ES 删除技能失败: {e}")
        return False


# ── 搜索 ──────────────────────────────────────────────


async def search_skills(
    query: str,
    filters: Optional[dict] = None,
    sort: Optional[str] = None,
    page: int = 1,
    size: int = 20,
) -> tuple[list[str], int]:
    """
    ES 全文搜索技能

    Args:
        query: 搜索关键词
        filters: 过滤条件，支持 skill_type, category_slug
        sort: 排序方式（quality_score / usage_count / created_at / _score）
        page: 页码（从 1 开始）
        size: 每页数量

    Returns:
        (匹配的 skill_id 列表, 总数)
    """
    filters = filters or {}

    try:
        es = await get_es_client()

        # ── 构建 bool query ───────────────────────────
        must_clauses = [
            {
                "multi_match": {
                    "query": query,
                    "fields": ["name^3", "description^2", "detail", "tags"],
                    "type": "best_fields",
                    "minimum_should_match": "30%",
                }
            }
        ]

        filter_clauses = [{"term": {"status": "active"}}]

        # 可选过滤条件
        if filters.get("skill_type"):
            filter_clauses.append({"term": {"skill_type": filters["skill_type"]}})
        if filters.get("category_slug"):
            filter_clauses.append({"term": {"category_slug": filters["category_slug"]}})

        body = {
            "query": {
                "bool": {
                    "must": must_clauses,
                    "filter": filter_clauses,
                }
            },
            "from": (page - 1) * size,
            "size": size,
            "_source": False,
            "stored_fields": "_none_",
            "docvalue_fields": [{"field": "id", "format": "use_field_mapping"}],
        }

        # ── 排序 ─────────────────────────────────────
        sort_mapping = {
            "quality_score": {"quality_score": {"order": "desc"}},
            "usage_count": {"usage_count": {"order": "desc"}},
            "created_at": {"created_at": {"order": "desc"}},
            "_score": {"_score": {"order": "desc"}},
        }
        body["sort"] = [sort_mapping.get(sort or "_score", {"_score": {"order": "desc"}})]

        result = await es.search(index=SKILLS_INDEX, body=body)

        # 提取匹配的 skill_id 列表
        total = result["hits"]["total"]["value"]
        skill_ids = [hit["_id"] for hit in result["hits"]["hits"]]

        logger.info(f"ES 搜索完成: query='{query}', 匹配 {total} 条, 返回 {len(skill_ids)} 条")
        return skill_ids, total

    except Exception as e:
        logger.error(f"ES 搜索失败: {e}")
        raise


# ── 供 search_service 调用的统一接口 ──────────────────


async def get_skill_ids_by_query(
    query: str,
    category_id: Optional[uuid.UUID] = None,
    skill_type: Optional[str] = None,
    sort: Optional[str] = None,
    page: int = 1,
    size: int = 20,
) -> tuple[list[uuid.UUID], int]:
    """
    供 search_service 调用的 ES 搜索接口

    将搜索参数转换为 ES 查询，返回 (skill_id 列表, 总数)。

    Args:
        query: 搜索关键词
        category_id: 分类 ID（需要先查 category_slug）
        skill_type: 技能类型
        sort: 排序方式
        page: 页码
        size: 每页数量

    Returns:
        (UUID 列表, 总数)

    Raises:
        Exception: ES 不可用时抛出异常，由调用方降级处理
    """
    # 构建 filters
    filters = {}
    if skill_type:
        filters["skill_type"] = skill_type

    # 如果传入了 category_id，需要查询 category_slug
    # 这里由 search_service 传入 category_slug 或由调用方处理
    if category_id:
        # category_slug 需要从外部传入，这里留空由 search_service 处理
        pass

    skill_ids_str, total = await search_skills(
        query=query,
        filters=filters,
        sort=sort,
        page=page,
        size=size,
    )

    # 将字符串 ID 转为 UUID
    skill_uuids = []
    for sid in skill_ids_str:
        try:
            skill_uuids.append(uuid.UUID(sid))
        except (ValueError, AttributeError):
            logger.warning(f"无效的 skill_id: {sid}")

    return skill_uuids, total


# ── ES 健康检查 ───────────────────────────────────────


async def es_health_check() -> dict:
    """
    检查 ES 集群健康状态

    Returns:
        包含状态信息的字典
    """
    try:
        es = await get_es_client()
        health = await es.cluster.health()
        index_exists = await es.indices.exists(index=SKILLS_INDEX)
        index_stats = None
        if index_exists:
            index_stats = await es.indices.stats(index=SKILLS_INDEX)

        return {
            "status": "ok",
            "cluster_name": health.get("cluster_name"),
            "cluster_status": health.get("status"),
            "number_of_nodes": health.get("number_of_nodes"),
            "index_exists": bool(index_exists),
            "index_doc_count": index_stats["indices"][SKILLS_INDEX]["primaries"]["docs"]["count"] if index_stats and SKILLS_INDEX in index_stats.get("indices", {}) else 0,
        }
    except Exception as e:
        logger.error(f"ES 健康检查失败: {e}")
        return {
            "status": "error",
            "message": str(e),
        }


# ── 搜索建议 ──────────────────────────────────────────


async def suggest_skills(prefix: str, size: int = 10) -> list[dict]:
    """搜索建议 — 基于 ES Completion Suggester

    Args:
        prefix: 输入前缀（至少 1 个字符）
        size: 返回建议数量

    Returns:
        [{"text": "skill name", "source": "github"}, ...]
    """
    if not prefix or len(prefix.strip()) < 1:
        return []

    es = await get_es_client()

    body = {
        "suggest": {
            "skill_suggest": {
                "prefix": prefix,
                "completion": {
                    "field": "name_suggest",
                    "size": size,
                    "skip_duplicates": True,
                },
            }
        }
    }

    try:
        result = await es.search(index=SKILLS_INDEX, body=body)
        options = (
            result.get("suggest", {})
            .get("skill_suggest", [{}])[0]
            .get("options", [])
        )
        return [
            {"text": opt["_source"]["name"], "source": opt["_source"].get("source", "")}
            for opt in options
        ]
    except Exception as e:
        logger.warning(f"ES 搜索建议失败: {e}")
        return []
