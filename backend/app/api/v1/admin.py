"""AI Tools Hub — 管理接口（ES 同步与健康检查）"""
import logging

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.models.tool import Tool

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/sync-es", summary="同步数据到 Elasticsearch")
async def sync_to_elasticsearch(db: AsyncSession = Depends(get_db)):
    """
    将所有活跃工具同步到 ES 索引（管理接口）

    流程：
    1. 确保 tools 索引存在（不存在则创建）
    2. 查询所有 status='active' 的工具
    3. 批量索引到 Elasticsearch
    """
    from app.services.es_service import ensure_tools_index, bulk_index_tools

    # 确保索引存在
    index_ok = await ensure_tools_index()
    if not index_ok:
        return {
            "success": False,
            "message": "ES 索引创建失败，请检查 Elasticsearch 服务状态",
        }

    # 查询所有活跃工具
    stmt = select(Tool).where(Tool.status == "active")
    result = await db.execute(stmt)
    tools = result.scalars().all()

    if not tools:
        return {
            "success": True,
            "message": "没有活跃工具需要同步",
            "total_active": 0,
            "indexed": 0,
        }

    # 批量索引到 ES
    count = await bulk_index_tools(tools)

    return {
        "success": True,
        "message": f"已同步 {count} 条工具到 ES",
        "total_active": len(tools),
        "indexed": count,
    }


@router.get("/es-health", summary="Elasticsearch 健康检查")
async def elasticsearch_health():
    """
    检查 Elasticsearch 集群健康状态

    返回信息包括：
    - 集群名称与状态
    - 节点数量
    - tools 索引是否存在及文档数量
    """
    from app.services.es_service import es_health_check

    health_info = await es_health_check()
    return health_info
