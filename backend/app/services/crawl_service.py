"""采集业务服务 — 协调采集器、数据库存储、ES 同步"""
import logging
import math
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.skill import Skill
from app.models.category import Category
from app.models.crawl_task import CrawlTask
from app.crawlers.base import CrawlResult
from app.crawlers.factory import get_crawler, get_all_crawlers
from app.services.es_service import index_skill

logger = logging.getLogger(__name__)


async def run_crawl_task(
    task_id: uuid.UUID,
) -> dict:
    """执行采集任务

    1. 读取任务配置
    2. 调用采集器搜索
    3. 将结果存入数据库（upsert by source + source_id）
    4. 同步到 ES
    5. 更新任务状态

    所有数据库操作使用独立 session，避免网络波动导致连接失效。

    返回执行结果摘要
    """
    from app.core.database import async_session_factory

    # 1. 读取任务配置
    async with async_session_factory() as read_session:
        stmt = select(CrawlTask).where(CrawlTask.id == task_id)
        result = await read_session.execute(stmt)
        task = result.scalar_one_or_none()

    if not task:
        logger.error(f"采集任务不存在: {task_id}")
        return {"success": False, "message": f"采集任务不存在: {task_id}"}

    source_type = task.source_type
    source_config = task.source_config or {}
    query = source_config.get("query", "mcp server")
    sort = source_config.get("sort", "stars")
    per_page = source_config.get("per_page", 30)
    page = source_config.get("page", 1)

    logger.info(f"开始执行采集任务: {task.name} (id={task_id})")

    # 2. 调用采集器搜索
    try:
        if source_type == "github":
            from app.crawlers.github_crawler import GitHubCrawler
            from app.core.config import settings
            crawler = GitHubCrawler(token=settings.GITHUB_TOKEN)
        elif source_type == "gitee":
            from app.crawlers.gitee_crawler import GiteeCrawler
            from app.core.config import settings
            crawler = GiteeCrawler(token=settings.GITEE_TOKEN)
        else:
            logger.error(f"不支持的采集源: {source_type}")
            return {"success": False, "message": f"不支持的采集源: {source_type}"}

        crawl_results = await crawler.search(
            query=query,
            sort=sort,
            per_page=per_page,
            page=page,
        )
    except Exception as e:
        logger.error(f"采集任务执行失败: {e}")
        # 更新任务状态为失败（使用独立 session）
        from app.core.database import async_session_factory
        async with async_session_factory() as fail_session:
            try:
                stmt = select(CrawlTask).where(CrawlTask.id == task_id)
                result = await fail_session.execute(stmt)
                task = result.scalar_one_or_none()
                if task:
                    task.last_run_at = datetime.utcnow()
                    task.last_result = {
                        "success": False,
                        "message": str(e),
                        "created": 0,
                        "updated": 0,
                        "total": 0,
                    }
                    await fail_session.commit()
            except Exception:
                await fail_session.rollback()
        return {"success": False, "message": f"采集执行失败: {e}"}

    # 3. 将结果存入数据库（使用独立 session，避免网络波动）
    save_result = await crawl_and_save(crawl_results, source=source_type)

    # 4. 更新任务状态（使用新的独立 session）
    from app.core.database import async_session_factory
    async with async_session_factory() as update_session:
        try:
            # 重新加载 task
            stmt = select(CrawlTask).where(CrawlTask.id == task_id)
            result = await update_session.execute(stmt)
            task = result.scalar_one_or_none()
            if task:
                task.last_run_at = datetime.utcnow()
                task.last_result = {
                    "success": True,
                    "created": save_result["created"],
                    "updated": save_result["updated"],
                    "skipped": save_result["skipped"],
                    "total": len(crawl_results),
                }
                await update_session.commit()
        except Exception as e:
            await update_session.rollback()
            logger.error(f"更新采集任务状态失败: {e}")

    logger.info(
        f"采集任务完成: {task.name}, "
        f"新增={save_result['created']}, 更新={save_result['updated']}, "
        f"跳过={save_result['skipped']}"
    )

    return {
        "success": True,
        "message": f"采集任务执行完成: {task.name}",
        **save_result,
        "total": len(crawl_results),
    }


async def crawl_and_save(
    results: list[CrawlResult],
    source: str = "github",
    db: AsyncSession = None,
) -> dict:
    """将采集结果保存到数据库

    对每条结果：
    1. 检查是否已存在（by source + source_id）
    2. 不存在则创建新 Skill
    3. 已存在则更新部分字段（description, tags, stars 等）
    - 自动生成 slug（基于 name）
    - 自动分类（基于 tags/keywords 匹配分类）
    - 计算质量评分

    返回 {"created": n, "updated": m, "skipped": k}
    """
    from app.core.database import async_session_factory

    created = 0
    updated = 0
    skipped = 0

    for result in results:
        if not result.source_id:
            logger.warning(f"跳过无 source_id 的结果: {result.name}")
            skipped += 1
            continue

        try:
            # 每条结果使用独立的 session，避免网络波动导致连接失效
            async with async_session_factory() as session:
                try:
                    # 检查是否已存在
                    stmt = select(Skill).where(
                        Skill.source == source,
                        Skill.source_id == result.source_id,
                    )
                    db_result = await session.execute(stmt)
                    existing_skill = db_result.scalar_one_or_none()

                    if existing_skill:
                        # 更新已有记录
                        existing_skill.description = result.description or existing_skill.description
                        existing_skill.tags = result.tags or existing_skill.tags
                        existing_skill.author = result.author or existing_skill.author
                        existing_skill.homepage_url = result.homepage_url or existing_skill.homepage_url
                        existing_skill.icon_url = result.icon_url or existing_skill.icon_url
                        existing_skill.license = result.license or existing_skill.license
                        existing_skill.last_synced_at = datetime.utcnow()

                        # 更新 extra 信息到对应的统计字段
                        stars = result.extra.get("stars", 0)
                        if stars:
                            existing_skill.usage_count = stars  # 暂用 usage_count 存储 stars

                        # 重新计算质量评分
                        quality = await calculate_quality_score(result)
                        existing_skill.quality_score = Decimal(str(round(quality, 2)))

                        await session.commit()
                        updated += 1
                        logger.debug(f"更新已有技能: {result.name}")
                    else:
                        # 创建新记录
                        slug = await _generate_unique_slug(session, result.name)

                        # 自动分类
                        category_id = await auto_classify(result, session)

                        # 计算质量评分
                        quality = await calculate_quality_score(result)

                        # 获取 README 作为 detail（限制 8 秒超时，避免阻塞）
                        detail = result.detail
                        if not detail and result.source_id:
                            try:
                                import asyncio
                                parts = result.source_id.split("/")
                                if len(parts) == 2:
                                    if source == "github":
                                        from app.crawlers.github_crawler import GitHubCrawler
                                        from app.core.config import settings
                                        crawler = GitHubCrawler(token=settings.GITHUB_TOKEN)
                                    else:
                                        from app.crawlers.gitee_crawler import GiteeCrawler
                                        from app.core.config import settings
                                        crawler = GiteeCrawler(token=settings.GITEE_TOKEN)
                                    readme = await asyncio.wait_for(
                                        crawler.get_readme(parts[0], parts[1]),
                                        timeout=8.0,
                                    )
                                    if readme:
                                        # 截取前 2000 字符作为 detail
                                        detail = readme[:2000]
                                        result.install_guide = readme[:500] if len(readme) > 200 else ""
                            except asyncio.TimeoutError:
                                logger.debug(f"获取 README 超时 ({result.source_id})，跳过")
                            except Exception as e:
                                logger.debug(f"获取 README 失败 ({result.source_id}): {e}")

                        new_skill = Skill(
                            name=result.name,
                            slug=slug,
                            description=result.description or "暂无描述",
                            detail=detail,
                            skill_type=result.skill_type,
                            platforms=result.platforms or [],
                            category_id=category_id,
                            tags=result.tags or [],
                            author=result.author,
                            version=result.version,
                            license=result.license,
                            github_url=result.github_url,
                            homepage_url=result.homepage_url,
                            gitee_url=result.gitee_url,
                            icon_url=result.icon_url,
                            screenshots=result.screenshots or [],
                            install_guide=result.install_guide,
                            usage_examples=result.usage_examples,
                            quality_score=Decimal(str(round(quality, 2))),
                            usage_count=result.extra.get("stars", 0),
                            source=source,
                            source_id=result.source_id,
                            status="active",
                            is_featured=False,
                            published_at=datetime.utcnow(),
                            last_synced_at=datetime.utcnow(),
                        )

                        session.add(new_skill)
                        await session.flush()
                        await session.commit()
                        created += 1
                        logger.debug(f"创建新技能: {result.name} (slug={slug})")

                        # 尝试同步到 ES
                        try:
                            await index_skill({
                                "id": str(new_skill.id),
                                "name": new_skill.name,
                                "name_suggest": new_skill.name,
                                "description": new_skill.description,
                                "detail": new_skill.detail or "",
                                "tags": new_skill.tags,
                                "skill_type": new_skill.skill_type,
                                "category_slug": "",
                                "author": new_skill.author or "",
                                "platforms": new_skill.platforms,
                                "quality_score": float(new_skill.quality_score),
                                "usage_count": new_skill.usage_count or 0,
                                "favorite_count": new_skill.favorite_count or 0,
                                "is_featured": new_skill.is_featured,
                                "status": new_skill.status,
                                "created_at": new_skill.created_at.isoformat() if new_skill.created_at else datetime.utcnow().isoformat(),
                            })
                        except Exception as e:
                            logger.debug(f"ES 索引失败（不影响主流程）: {e}")

                except Exception as e:
                    await session.rollback()
                    raise

        except Exception as e:
            logger.error(f"处理采集结果失败 ({result.name}): {e}", exc_info=True)
            skipped += 1

    logger.info(f"采集结果保存完成: 新增={created}, 更新={updated}, 跳过={skipped}")

    return {"created": created, "updated": updated, "skipped": skipped}


async def auto_classify(result: CrawlResult, db: AsyncSession = None) -> Optional[uuid.UUID]:
    """自动分类 — 基于关键词匹配分类

    检查 result.tags, description, name 中的关键词，
    匹配 categories 表中的 name/slug/description，
    返回最匹配的 category_id。
    """
    # 构建待匹配文本（小写化）
    text_parts = [
        result.name.lower(),
        result.description.lower(),
    ]
    # 添加 tags
    for tag in (result.tags or []):
        text_parts.append(str(tag).lower())

    combined_text = " ".join(text_parts)

    # 关键词到分类 slug 的映射规则（AI Tools Hub 分类体系）
    keyword_rules = {
        # MCP 工具
        "mcp-server": ["mcp server", "mcp-server", "model context protocol", "mcp 协议"],
        "mcp-client": ["mcp client", "mcp-client", "mcp 客户端"],
        "mcp-toolkit": ["mcp toolkit", "mcp tools", "mcp 工具集", "mcp 集合"],

        # AI Agent
        "agent-framework": ["agent framework", "智能体框架", "autogen", "crewai", "langgraph", "multi-agent"],
        "agent-tool": ["agent tool", "agent 工具", "function calling", "tool calling"],
        "multi-agent": ["multi-agent", "多智能体", "agent team", "agent 协作"],

        # Prompt 工程
        "prompt-template": ["prompt template", "提示词模板", "prompt 模板"],
        "prompt-optimizer": ["prompt optimizer", "prompt 优化", "prompt engineering", "提示词工程"],
        "prompt-ide": ["prompt ide", "prompt editor", "prompt 编辑器"],

        # LLM 框架
        "langchain": ["langchain", "langgraph", "langsmith"],
        "llamaindex": ["llamaindex", "llama index", "llama_index"],
        "semantic-kernel": ["semantic kernel", "sk sdk"],

        # RAG 工具
        "vector-database": ["vector database", "向量数据库", "pinecone", "milvus", "chroma", "weaviate", "qdrant", "faiss"],
        "embedding": ["embedding", "嵌入", "向量模型", "openai embedding", "sentence-transformer"],
        "document-parser": ["document parser", "文档解析", "pdf parser", "unstructured", "docling"],

        # AI 编程
        "code-generation": ["code generation", "代码生成", "codegen", "copilot", "code completion"],
        "code-review": ["code review", "代码审查", "code quality", "lint"],
        "copilot-tool": ["copilot", "cursor", "ai editor", "ai 编程", "code assistant"],

        # AI 创作
        "copywriting": ["copywriting", "文案", "writing", "写作"],
        "image-generation": ["image generation", "图像生成", "stable diffusion", "midjourney", "dall-e", "text-to-image", "diffusion"],
        "audio-generation": ["audio generation", "音频生成", "tts", "text-to-speech", "speech synthesis", "music generation"],

        # GPTs & 插件
        "custom-gpt": ["custom gpt", "gpts", "chatgpt plugin", "gpt actions"],
        "openai-plugin": ["openai plugin", "chatgpt plugin", "retrieval plugin"],
        "claude-tool": ["claude", "claude tool", "anthropic tool"],
    }

    # 计算每个分类的匹配分数
    best_category_slug = None
    best_score = 0

    for category_slug, keywords in keyword_rules.items():
        score = 0
        for keyword in keywords:
            if keyword.lower() in combined_text:
                score += 1
        if score > best_score:
            best_score = score
            best_category_slug = category_slug

    if not best_category_slug or best_score == 0:
        return None

    # 查询数据库获取 category_id
    try:
        if db:
            stmt = select(Category).where(Category.slug == best_category_slug)
            db_result = await db.execute(stmt)
            category = db_result.scalar_one_or_none()
            if category:
                return category.id
        else:
            from app.core.database import async_session_factory
            async with async_session_factory() as session:
                stmt = select(Category).where(Category.slug == best_category_slug)
                db_result = await session.execute(stmt)
                category = db_result.scalar_one_or_none()
                if category:
                    return category.id
    except Exception as e:
        logger.debug(f"自动分类查询失败: {e}")

    return None


async def calculate_quality_score(result: CrawlResult) -> float:
    """计算质量评分（0~1）

    评分维度：
    - 是否有 description (0.1)
    - description 长度 (0~0.15)
    - 是否有 README (0.15) — 用 detail 是否有内容近似
    - stars 数量 (0~0.2, 对数缩放)
    - forks 数量 (0~0.1, 对数缩放)
    - 是否有 license (0.1)
    - 是否有 homepage (0.05)
    - tags 数量 (0~0.1)
    - 最近更新 (0.05)
    """
    score = 0.0

    # 1. 是否有 description (0.1)
    if result.description and len(result.description.strip()) > 0:
        score += 0.1

    # 2. description 长度 (0~0.15)，100 字符以上满分
    desc_len = len(result.description or "")
    score += min(desc_len / 100.0, 1.0) * 0.15

    # 3. 是否有 README/detail (0.15)
    if result.detail and len(result.detail.strip()) > 50:
        score += 0.15

    # 4. stars 数量 (0~0.2, 对数缩放)，10000 stars 满分
    stars = result.extra.get("stars", 0) or 0
    if stars > 0:
        score += min(math.log10(stars + 1) / math.log10(10001), 1.0) * 0.2

    # 5. forks 数量 (0~0.1, 对数缩放)，1000 forks 满分
    forks = result.extra.get("forks", 0) or 0
    if forks > 0:
        score += min(math.log10(forks + 1) / math.log10(1001), 1.0) * 0.1

    # 6. 是否有 license (0.1)
    if result.license and len(result.license.strip()) > 0:
        score += 0.1

    # 7. 是否有 homepage (0.05)
    if result.homepage_url and len(result.homepage_url.strip()) > 0:
        score += 0.05

    # 8. tags 数量 (0~0.1)，5 个以上满分
    tag_count = len(result.tags or [])
    score += min(tag_count / 5.0, 1.0) * 0.1

    # 9. 最近更新 (0.05) — 检查 extra 中的 pushed_at
    pushed_at = result.extra.get("pushed_at", "")
    if pushed_at:
        try:
            from datetime import timezone
            pushed_time = datetime.fromisoformat(pushed_at.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            days_since_update = (now - pushed_time).days
            # 30 天内更新满分，365 天以上 0 分
            if days_since_update <= 30:
                score += 0.05
            elif days_since_update <= 365:
                score += 0.05 * (1 - (days_since_update - 30) / 335)
        except (ValueError, TypeError):
            pass

    # 确保分数在 0~1 范围内
    return max(0.0, min(1.0, score))


async def _generate_unique_slug(db: AsyncSession, name: str) -> str:
    """生成唯一的 slug

    基于 name 使用 slugify 生成，如果冲突则追加数字后缀。
    """
    from slugify import slugify

    base_slug = slugify(name, lowercase=True, max_length=180)
    if not base_slug:
        base_slug = f"skill-{uuid.uuid4().hex[:8]}"

    # 检查是否已存在
    stmt = select(Skill).where(Skill.slug == base_slug)
    db_result = await db.execute(stmt)
    existing = db_result.scalar_one_or_none()

    if not existing:
        return base_slug

    # 存在冲突，追加数字后缀
    for i in range(2, 100):
        candidate = f"{base_slug}-{i}"
        stmt = select(Skill).where(Skill.slug == candidate)
        db_result = await db.execute(stmt)
        if not db_result.scalar_one_or_none():
            return candidate

    # 极端情况，追加 UUID
    return f"{base_slug}-{uuid.uuid4().hex[:8]}"


async def quick_crawl(
    query: str = "mcp server",
    source: str = "auto",
    max_items: int = 30,
) -> dict:
    """快速采集 — 一键搜索并保存

    不再依赖外部传入的 db session，全部使用独立 session，
    避免网络波动导致连接失效。

    source="auto" 时使用配置的默认采集器。
    返回 {"created": n, "updated": m, "total": t}
    """
    # 获取采集器
    if source == "auto":
        try:
            crawler = get_crawler()
        except ValueError as e:
            return {"success": False, "message": str(e), "created": 0, "updated": 0, "total": 0}
    elif source == "github":
        from app.crawlers.github_crawler import GitHubCrawler
        from app.core.config import settings
        crawler = GitHubCrawler(token=settings.GITHUB_TOKEN)
    elif source == "gitee":
        from app.crawlers.gitee_crawler import GiteeCrawler
        from app.core.config import settings
        crawler = GiteeCrawler(token=settings.GITEE_TOKEN)
    else:
        return {"success": False, "message": f"不支持的采集源: {source}", "created": 0, "updated": 0, "total": 0}

    # 搜索
    try:
        results = await crawler.search(query=query, per_page=max_items)
    except Exception as e:
        logger.error(f"快速采集搜索失败: {e}")
        return {"success": False, "message": f"搜索失败: {e}", "created": 0, "updated": 0, "total": 0}

    if not results:
        return {"success": True, "message": "未找到匹配结果", "created": 0, "updated": 0, "total": 0}

    # 保存到数据库（不传 db，使用独立 session）
    save_result = await crawl_and_save(results, source=source)

    return {
        "success": True,
        "message": f"采集完成: 新增 {save_result['created']} 条, 更新 {save_result['updated']} 条",
        "created": save_result["created"],
        "updated": save_result["updated"],
        "total": len(results),
    }


async def full_crawl(
    source: str = "github",
    max_items_per_query: int = 30,
    delay_between_queries: float = 3.0,
    clean_before: bool = False,
) -> dict:
    """全量采集 — 遍历所有预设搜索关键词执行采集
    
    对 GitHub 采集器，遍历 SEARCH_QUERIES 中的所有关键词。
    对 Gitee 采集器，使用默认搜索词。
    
    Args:
        source: 采集源 (github/gitee)
        max_items_per_query: 每个查询最多返回条数
        delay_between_queries: 查询之间的延迟（秒），避免触发速率限制
        clean_before: 采集前是否清理旧数据（清空 skills 表 + 重建 ES 索引）
    
    Returns:
        {"success": True, "queries": n, "total_created": x, "total_updated": y, "total_skipped": z, "details": [...]}
    """
    import asyncio
    from app.core.database import async_session_factory
    from app.services.es_service import ensure_skills_index
    
    total_created = 0
    total_updated = 0
    total_skipped = 0
    details = []
    
    # ── 采集前清理旧数据 ─────────────────────────────
    if clean_before:
        logger.warning("=== 采集前清理模式：将清空 skills 表并重建 ES 索引 ===")
        
        # 1. 清空 skills 表
        try:
            async with async_session_factory() as session:
                from sqlalchemy import text
                await session.execute(text("DELETE FROM skills"))
                await session.commit()
                logger.info("已清空 skills 表")
        except Exception as e:
            logger.error(f"清空 skills 表失败: {e}")
        
        # 2. 删除并重建 ES 索引
        try:
            from app.services.es_service import get_es_client
            es = await get_es_client()
            exists = await es.indices.exists(index="skills")
            if exists:
                await es.indices.delete(index="skills")
                logger.info("已删除旧 ES 索引")
            await ensure_skills_index()
            logger.info("已重建 ES 索引")
        except Exception as e:
            logger.warning(f"ES 索引重建失败（不影响采集）: {e}")
    
    # 获取搜索关键词列表
    if source == "github":
        from app.crawlers.github_crawler import GitHubCrawler
        from app.core.config import settings
        crawler = GitHubCrawler(token=settings.GITHUB_TOKEN)
        queries = crawler.SEARCH_QUERIES
    elif source == "gitee":
        from app.crawlers.gitee_crawler import GiteeCrawler
        from app.core.config import settings
        crawler = GiteeCrawler(token=settings.GITEE_TOKEN)
        queries = ["mcp server", "ai agent", "llm tool", "ai skill"]
    else:
        return {"success": False, "message": f"不支持的采集源: {source}"}
    
    logger.info(f"开始全量采集: source={source}, queries={len(queries)}")
    
    for i, query in enumerate(queries):
        logger.info(f"[{i+1}/{len(queries)}] 采集关键词: '{query}'")
        
        try:
            # 搜索
            results = await crawler.search(query=query, per_page=max_items_per_query)
            
            if not results:
                details.append({"query": query, "total": 0, "created": 0, "updated": 0, "skipped": 0})
                logger.info(f"[{i+1}/{len(queries)}] '{query}' 无结果")
                continue
            
            # 保存到数据库
            save_result = await crawl_and_save(results, source=source)
            
            detail = {
                "query": query,
                "total": len(results),
                "created": save_result["created"],
                "updated": save_result["updated"],
                "skipped": save_result["skipped"],
            }
            details.append(detail)
            
            total_created += save_result["created"]
            total_updated += save_result["updated"]
            total_skipped += save_result["skipped"]
            
            logger.info(
                f"[{i+1}/{len(queries)}] '{query}' 完成: "
                f"结果={len(results)}, 新增={save_result['created']}, "
                f"更新={save_result['updated']}, 跳过={save_result['skipped']}"
            )
            
        except Exception as e:
            logger.error(f"[{i+1}/{len(queries)}] '{query}' 失败: {e}", exc_info=True)
            details.append({"query": query, "total": 0, "created": 0, "updated": 0, "skipped": 0, "error": str(e)})
        
        # 查询间延迟，避免触发速率限制
        if i < len(queries) - 1:
            await asyncio.sleep(delay_between_queries)
    
    logger.info(
        f"全量采集完成: queries={len(queries)}, "
        f"总新增={total_created}, 总更新={total_updated}, 总跳过={total_skipped}"
    )
    
    return {
        "success": True,
        "queries": len(queries),
        "total_created": total_created,
        "total_updated": total_updated,
        "total_skipped": total_skipped,
        "details": details,
    }
