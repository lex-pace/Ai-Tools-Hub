"""AI Skills Hub — Elasticsearch 异步客户端单例"""
from elasticsearch import AsyncElasticsearch

from app.core.config import settings

# 全局 ES 客户端单例
_es_client: AsyncElasticsearch | None = None


async def get_es_client() -> AsyncElasticsearch:
    """获取 Elasticsearch 异步客户端单例"""
    global _es_client
    if _es_client is None:
        _es_client = AsyncElasticsearch(
            hosts=[settings.ELASTICSEARCH_URL],
            request_timeout=30,
            max_retries=3,
            retry_on_timeout=True,
        )
    return _es_client


async def close_es_client() -> None:
    """关闭 Elasticsearch 客户端连接"""
    global _es_client
    if _es_client is not None:
        await _es_client.close()
        _es_client = None
