"""Embedding 服务 — 文本向量化

支持多 Provider 切换：
- siliconcloud: SiliconCloud BGE-M3（OpenAI 兼容格式）
- local: 本地 BGE-Small（sentence-transformers）
"""
import logging
from abc import ABC, abstractmethod
from typing import List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class BaseEmbeddingProvider(ABC):
    """Embedding Provider 抽象基类"""

    @abstractmethod
    async def embed(self, text: str) -> List[float]:
        """将单条文本转换为向量"""
        pass

    @abstractmethod
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """将多条文本转换为向量"""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """健康检查"""
        pass


class SiliconCloudEmbedding(BaseEmbeddingProvider):
    """SiliconCloud BGE-M3 Embedding Provider

    使用 SiliconCloud API（OpenAI 兼容格式）调用 BAAI/bge-m3 模型。
    """

    def __init__(self):
        self.api_key = settings.SILICONFLOW_API_KEY
        self.base_url = settings.SILICONFLOW_BASE_URL
        self.model = settings.SILICONFLOW_EMBEDDING_MODEL

    async def embed(self, text: str) -> List[float]:
        result = await self.embed_batch([text])
        return result[0] if result else []

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/embeddings",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "input": texts,
                    "encoding_format": "float",
                },
            )

            if response.status_code != 200:
                logger.error(
                    f"SiliconCloud Embedding API 错误: "
                    f"{response.status_code} {response.text[:200]}"
                )
                return [[] for _ in texts]

            data = response.json()
            # 按 index 排序确保顺序正确
            embeddings = sorted(
                data.get("data", []), key=lambda x: x.get("index", 0)
            )
            return [item["embedding"] for item in embeddings]

    async def health_check(self) -> bool:
        try:
            result = await self.embed("test")
            return len(result) > 0
        except Exception:
            return False


class LocalEmbedding(BaseEmbeddingProvider):
    """本地 BGE-Small Embedding Provider

    使用 sentence-transformers 在本地运行 BAAI/bge-small-zh-v1.5 模型。
    首次使用会自动下载模型。
    注意：需要安装 sentence-transformers 和 torch。
    """

    def __init__(self):
        self.model_name = settings.LOCAL_EMBEDDING_MODEL
        self.device = settings.LOCAL_EMBEDDING_DEVICE
        self._model = None

    def _get_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(
                self.model_name, device=self.device
            )
            logger.info(f"本地 Embedding 模型加载完成: {self.model_name}")
        return self._model

    async def embed(self, text: str) -> List[float]:
        result = await self.embed_batch([text])
        return result[0] if result else []

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        try:
            import asyncio

            loop = asyncio.get_event_loop()
            model = self._get_model()
            embeddings = await loop.run_in_executor(None, model.encode, texts)
            return [emb.tolist() for emb in embeddings]
        except ImportError:
            logger.error(
                "本地 Embedding 需要 sentence-transformers: "
                "pip install sentence-transformers"
            )
            return [[] for _ in texts]
        except Exception as e:
            logger.error(f"本地 Embedding 失败: {e}")
            return [[] for _ in texts]

    async def health_check(self) -> bool:
        try:
            result = await self.embed("test")
            return len(result) > 0
        except Exception:
            return False


def get_embedding_provider() -> BaseEmbeddingProvider:
    """工厂函数：根据配置返回对应的 Embedding Provider"""
    provider = settings.EMBEDDING_PROVIDER.lower()

    if provider == "siliconcloud":
        return SiliconCloudEmbedding()
    elif provider == "local":
        return LocalEmbedding()
    else:
        raise ValueError(
            f"不支持的 Embedding Provider: {provider}，支持: siliconcloud, local"
        )


# ── 全局单例 ────────────────────────────────────────────────────────

_embedding_provider: Optional[BaseEmbeddingProvider] = None


async def get_embeddings(texts: List[str]) -> List[List[float]]:
    """便捷函数：获取文本向量（使用全局单例）"""
    global _embedding_provider
    if _embedding_provider is None:
        _embedding_provider = get_embedding_provider()
    return await _embedding_provider.embed_batch(texts)


async def get_embedding(text: str) -> List[float]:
    """便捷函数：获取单条文本向量"""
    result = await get_embeddings([text])
    return result[0] if result else []
