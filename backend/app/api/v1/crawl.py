"""采集管理 API 端点"""
import logging
import uuid
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.exceptions import NotFoundError, ExternalServiceError
from app.models.crawl_task import CrawlTask
from app.schemas.crawl import (
    CrawlTaskCreate,
    CrawlTaskOut,
    QuickCrawlRequest,
    CrawlResponse,
)
from app.services import crawl_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/quick", response_model=CrawlResponse, summary="快速采集")
async def quick_crawl(
    request: QuickCrawlRequest,
):
    """快速采集 — 一键搜索并保存

    传入搜索关键词、采集源和最大数量，立即执行采集并返回结果。
    不再依赖请求级 db session，内部使用独立 session。
    """
    try:
        result = await crawl_service.quick_crawl(
            query=request.query,
            source=request.source,
            max_items=request.max_items,
        )
    except Exception as e:
        logger.error("快速采集失败: query=%s, source=%s, error=%s", request.query, request.source, e, exc_info=True)
        raise ExternalServiceError("采集器", f"快速采集执行失败: {e}")

    return CrawlResponse(**result)


@router.get("/tasks", response_model=List[CrawlTaskOut], summary="获取采集任务列表")
async def list_crawl_tasks(
    status: str = Query(default=None, description="按状态筛选"),
    page: int = Query(default=1, ge=1, description="页码"),
    size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
):
    """获取所有采集任务列表，支持按状态筛选和分页"""
    try:
        stmt = select(CrawlTask).order_by(CrawlTask.created_at.desc())

        if status:
            stmt = stmt.where(CrawlTask.status == status)

        # 分页
        offset = (page - 1) * size
        stmt = stmt.offset(offset).limit(size)

        result = await db.execute(stmt)
        tasks = result.scalars().all()
    except Exception as e:
        logger.error("获取采集任务列表失败: %s", e, exc_info=True)
        raise

    return tasks


@router.post("/tasks", response_model=CrawlTaskOut, summary="创建采集任务")
async def create_crawl_task(
    task_data: CrawlTaskCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建新的采集任务

    需要指定任务名称、采集源（github/gitee）和采集配置。
    """
    # 验证 source_type
    if task_data.source_type not in ("github", "gitee"):
        from app.core.exceptions import BadRequestError
        raise BadRequestError(f"不支持的采集源: {task_data.source_type}，支持: github, gitee")

    # 验证 schedule
    if task_data.schedule and task_data.schedule not in ("daily", "weekly", "manual"):
        from app.core.exceptions import BadRequestError
        raise BadRequestError(f"不支持的调度周期: {task_data.schedule}，支持: daily, weekly, manual")

    try:
        task = CrawlTask(
            name=task_data.name,
            source_type=task_data.source_type,
            source_config=task_data.source_config,
            schedule=task_data.schedule,
            status="active",
        )

        db.add(task)
        await db.commit()
        await db.refresh(task)
    except Exception as e:
        logger.error("创建采集任务失败: %s", e, exc_info=True)
        await db.rollback()
        raise

    return task


@router.post("/tasks/{task_id}/run", response_model=CrawlResponse, summary="手动执行采集任务")
async def run_crawl_task(
    task_id: uuid.UUID,
):
    """手动触发执行指定的采集任务"""
    try:
        result = await crawl_service.run_crawl_task(task_id=task_id)
    except Exception as e:
        logger.error("执行采集任务失败: task_id=%s, error=%s", task_id, e, exc_info=True)
        raise ExternalServiceError("采集器", f"采集任务执行失败: {e}")

    if not result.get("success"):
        raise ExternalServiceError(
            "采集器",
            result.get("message", "采集任务执行失败"),
        )

    return CrawlResponse(
        success=result["success"],
        message=result["message"],
        created=result.get("created", 0),
        updated=result.get("updated", 0),
        total=result.get("total", 0),
    )


@router.post("/full", summary="全量采集")
async def full_crawl_endpoint(
    source: str = Query(default="github", description="采集源: github/gitee"),
    max_items: int = Query(default=30, ge=1, le=100, description="每个关键词最大采集数"),
):
    """全量采集 — 遍历所有预设关键词执行采集
    
    GitHub 采集器会遍历 8 个预设搜索关键词。
    采集过程较慢（约 2-5 分钟），建议异步调用。
    """
    try:
        result = await crawl_service.full_crawl(
            source=source,
            max_items_per_query=max_items,
        )
    except Exception as e:
        logger.error("全量采集失败: source=%s, error=%s", source, e, exc_info=True)
        raise ExternalServiceError("采集器", f"全量采集失败: {e}")
    
    return {
        "success": result["success"],
        "message": f"全量采集完成: {result['queries']} 个关键词, "
                   f"新增 {result['total_created']} 条, "
                   f"更新 {result['total_updated']} 条",
        "queries": result["queries"],
        "total_created": result["total_created"],
        "total_updated": result["total_updated"],
        "total_skipped": result["total_skipped"],
        "details": result.get("details", []),
    }


@router.get("/tasks/{task_id}", response_model=CrawlTaskOut, summary="获取任务详情")
async def get_crawl_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """获取指定采集任务的详细信息"""
    try:
        stmt = select(CrawlTask).where(CrawlTask.id == task_id)
        result = await db.execute(stmt)
        task = result.scalar_one_or_none()
    except Exception as e:
        logger.error("查询采集任务失败: task_id=%s, error=%s", task_id, e, exc_info=True)
        raise

    if not task:
        raise NotFoundError("CrawlTask", str(task_id))

    return task
