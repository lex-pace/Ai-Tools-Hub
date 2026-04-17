"""LLM 服务 — 统一的 LLM 调用接口

支持多 Provider 切换：
- siliconcloud: SiliconCloud (OpenAI 兼容格式)
- google: Google Gemini
- groq: Groq (OpenAI 兼容格式)
- deepseek: DeepSeek (OpenAI 兼容格式)
- baidu: 百度千帆 (access_token 认证)
"""
import json
import logging
import re
from typing import Optional
from dataclasses import dataclass, field

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class LLMResponse:
    """LLM 响应"""
    content: str
    model: str
    usage: dict = field(default_factory=dict)  # {"prompt_tokens": n, "completion_tokens": m, "total_tokens": t}


class LLMService:
    """LLM 服务 — 支持多 Provider 切换"""

    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """懒加载 HTTP 客户端"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=60.0)
        return self._client

    async def chat(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> LLMResponse:
        """
        调用 LLM 进行对话

        messages 格式: [{"role": "system"|"user"|"assistant", "content": "..."}]

        根据 self.provider 选择不同的 API：
        - siliconcloud: SiliconCloud (OpenAI 兼容)
        - google: Google Gemini
        - groq: Groq (OpenAI 兼容)
        - deepseek: DeepSeek (OpenAI 兼容)
        - baidu: 百度千帆 (access_token 认证)
        """
        provider = self.provider.lower()

        if provider == "siliconcloud":
            return await self._chat_openai_compatible(
                base_url=settings.SILICONFLOW_BASE_URL,
                api_key=settings.SILICONFLOW_API_KEY,
                model=settings.SILICONFLOW_LLM_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
        elif provider == "google":
            return await self.chat_google(messages, temperature, max_tokens)
        elif provider == "groq":
            return await self._chat_openai_compatible(
                base_url=settings.GROQ_BASE_URL,
                api_key=settings.GROQ_API_KEY,
                model=settings.GROQ_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
        elif provider == "deepseek":
            return await self._chat_openai_compatible(
                base_url=settings.DEEPSEEK_BASE_URL,
                api_key=settings.DEEPSEEK_API_KEY,
                model=settings.DEEPSEEK_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
        elif provider == "baidu":
            return await self.chat_baidu(messages, temperature, max_tokens)
        else:
            raise ValueError(f"不支持的 LLM Provider: {provider}")

    # ── OpenAI 兼容格式（SiliconCloud / Groq / DeepSeek 共用）─────────

    async def _chat_openai_compatible(
        self,
        base_url: str,
        api_key: str,
        model: str,
        messages: list[dict],
        temperature: float,
        max_tokens: int,
    ) -> LLMResponse:
        """
        OpenAI 兼容格式调用（SiliconCloud / Groq / DeepSeek 共用）

        POST {base_url}/chat/completions
        Headers: {"Authorization": "Bearer {api_key}", "Content-Type": "application/json"}
        Body: {"model": model, "messages": messages, "temperature": temperature, "max_tokens": max_tokens}
        """
        client = await self._get_client()
        url = f"{base_url.rstrip('/')}/chat/completions"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        logger.info(f"调用 LLM ({model}): url={url}")

        try:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

            content = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})

            logger.info(f"LLM 响应成功: model={model}, tokens={usage.get('total_tokens', '?')}")
            return LLMResponse(
                content=content,
                model=model,
                usage={
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0),
                },
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"LLM HTTP 错误: status={e.response.status_code}, body={e.response.text[:500]}")
            raise
        except Exception as e:
            logger.error(f"LLM 调用失败: {e}")
            raise

    # ── Google Gemini ────────────────────────────────────────────────

    async def chat_google(
        self,
        messages: list[dict],
        temperature: float,
        max_tokens: int,
    ) -> LLMResponse:
        """
        Google Gemini API 调用

        POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
        """
        client = await self._get_client()
        model = settings.GEMINI_MODEL
        api_key = settings.GOOGLE_GEMINI_API_KEY
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        # 将 OpenAI 格式的 messages 转换为 Gemini 格式
        # Gemini 使用 contents 数组，system instruction 单独设置
        system_instruction = None
        contents = []

        for msg in messages:
            role = msg["role"]
            content = msg["content"]

            if role == "system":
                system_instruction = content
            elif role == "user":
                contents.append({"role": "user", "parts": [{"text": content}]})
            elif role == "assistant":
                contents.append({"role": "model", "parts": [{"text": content}]})

        payload: dict = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }

        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        logger.info(f"调用 Google Gemini: model={model}")

        try:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

            # 解析 Gemini 响应格式
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            usage_meta = data.get("usageMetadata", {})

            return LLMResponse(
                content=content,
                model=model,
                usage={
                    "prompt_tokens": usage_meta.get("promptTokenCount", 0),
                    "completion_tokens": usage_meta.get("candidatesTokenCount", 0),
                    "total_tokens": usage_meta.get("totalTokenCount", 0),
                },
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"Google Gemini HTTP 错误: status={e.response.status_code}, body={e.response.text[:500]}")
            raise
        except Exception as e:
            logger.error(f"Google Gemini 调用失败: {e}")
            raise

    # ── 百度千帆 ────────────────────────────────────────────────────

    async def chat_baidu(
        self,
        messages: list[dict],
        temperature: float,
        max_tokens: int,
    ) -> LLMResponse:
        """
        百度千帆 API 调用（access_token 认证）

        1. 先用 API Key + Secret Key 获取 access_token
        2. 再用 access_token 调用对话接口
        """
        client = await self._get_client()
        model = settings.BAIDU_MODEL

        # ── 获取 access_token ─────────────────────────
        token_url = (
            f"https://aip.baidubce.com/oauth/2.0/token"
            f"?grant_type=client_credentials"
            f"&client_id={settings.BAIDU_API_KEY}"
            f"&client_secret={settings.BAIDU_SECRET_KEY}"
        )

        try:
            token_resp = await client.post(token_url)
            token_resp.raise_for_status()
            token_data = token_resp.json()
            access_token = token_data.get("access_token")
            if not access_token:
                raise ValueError(f"百度千帆获取 access_token 失败: {token_data}")
        except Exception as e:
            logger.error(f"百度千帆获取 access_token 失败: {e}")
            raise

        # ── 调用对话接口 ─────────────────────────────
        chat_url = (
            f"https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/{model}"
            f"?access_token={access_token}"
        )

        # 将 OpenAI 格式的 messages 转换为百度千帆格式
        # 百度千帆 messages 格式与 OpenAI 类似，但 system 用 "system" role
        baidu_messages = []
        for msg in messages:
            baidu_messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })

        payload = {
            "messages": baidu_messages,
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }

        logger.info(f"调用百度千帆: model={model}")

        try:
            resp = await client.post(chat_url, json=payload)
            resp.raise_for_status()
            data = resp.json()

            content = data["result"]
            usage = data.get("usage", {})

            return LLMResponse(
                content=content,
                model=model,
                usage={
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0),
                },
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"百度千帆 HTTP 错误: status={e.response.status_code}, body={e.response.text[:500]}")
            raise
        except Exception as e:
            logger.error(f"百度千帆调用失败: {e}")
            raise

    # ── 资源管理 ────────────────────────────────────────────────────

    async def close(self):
        """关闭客户端"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None


# ── 全局单例 ────────────────────────────────────────────────────────

_llm_service: Optional[LLMService] = None


async def get_llm_service() -> LLMService:
    """获取 LLM 服务单例"""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service


async def close_llm_service():
    """关闭 LLM 服务（在应用关闭时调用）"""
    global _llm_service
    if _llm_service:
        await _llm_service.close()
        _llm_service = None
