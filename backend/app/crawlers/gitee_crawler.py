"""Gitee 采集器 — 通过 Gitee API v5 搜索和获取仓库信息"""
import asyncio
import base64
import logging
from typing import Optional

import httpx

from .base import BaseCrawler, CrawlResult

logger = logging.getLogger(__name__)


class GiteeCrawler(BaseCrawler):
    """Gitee 数据采集器

    Gitee API v5 文档: https://gitee.com/api/v5/swagger
    搜索不需要认证即可使用，但有 token 可以提高速率限制。
    """

    BASE_URL = "https://gitee.com/api/v5"

    # AI Skills 相关的搜索关键词
    SEARCH_QUERIES = [
        "mcp server",
        "model context protocol",
        "AI agent",
        "LLM tool",
        "prompt template",
        "openai plugin",
    ]

    # 搜索关键词 → skill_type 映射
    QUERY_TYPE_MAP = {
        "mcp server": "mcp_server",
        "model context protocol": "mcp_server",
        "ai agent": "agent_skill",
        "llm tool": "agent_skill",
        "prompt template": "prompt_template",
        "openai plugin": "custom_gpt",
    }

    def __init__(self, token: str = ""):
        super().__init__(token)
        self.headers = {
            "User-Agent": "AI-Tools-Hub/1.0",
        }
        # Gitee API 使用 access_token 参数而非 header
        self.token_param = {"access_token": token} if token else {}

    async def search(
        self,
        query: str,
        sort: str = "stars",
        per_page: int = 30,
        page: int = 1,
    ) -> list[CrawlResult]:
        """搜索 Gitee 仓库

        GET /search/repositories?q={query}&sort={sort}&page={page}&per_page={per_page}
        sort 支持: stars | updated | forks
        """
        params = {
            "q": query,
            "sort": sort,
            "order": "desc",
            "page": page,
            "per_page": min(per_page, 100),
        }
        params.update(self.token_param)

        self.logger.info(f"搜索 Gitee: query='{query}', sort={sort}, page={page}")
        data = await self._request("/search/repositories", params=params)

        if not data:
            self.logger.warning("Gitee 搜索返回空结果")
            return []

        # Gitee 搜索接口直接返回列表
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict) and "items" in data:
            items = data["items"]
        else:
            self.logger.warning(f"Gitee 搜索返回格式异常: {type(data)}")
            return []

        results = []
        inferred_type = self.QUERY_TYPE_MAP.get(query.lower(), "mcp_server")
        for item in items:
            result = self._parse_repo_item(item, inferred_type)
            if result:
                results.append(result)

        self.logger.info(f"Gitee 搜索完成: 共 {len(results)} 条结果")
        return results

    async def get_repo_info(self, owner: str, repo: str) -> Optional[CrawlResult]:
        """获取单个仓库详情

        GET /repos/{owner}/{repo}
        """
        self.logger.info(f"获取 Gitee 仓库详情: {owner}/{repo}")
        params = dict(self.token_param)
        data = await self._request(f"/repos/{owner}/{repo}", params=params)

        if not data:
            self.logger.warning(f"Gitee 仓库不存在: {owner}/{repo}")
            return None

        return self._parse_repo_item(data)

    async def get_readme(self, owner: str, repo: str) -> str:
        """获取 README 内容

        GET /repos/{owner}/{repo}/readme
        Gitee 返回的 content 可能是 base64 编码或明文
        """
        self.logger.info(f"获取 Gitee README: {owner}/{repo}")
        params = dict(self.token_param)
        data = await self._request(f"/repos/{owner}/{repo}/readme", params=params)

        if not data:
            self.logger.warning(f"Gitee README 不存在: {owner}/{repo}")
            return ""

        try:
            # Gitee 可能返回 content 字段（base64）或直接返回文本
            content = data.get("content", "")
            encoding = data.get("encoding", "")

            if encoding == "base64" and content:
                content = content.replace("\n", "")
                content = base64.b64decode(content).decode("utf-8", errors="replace")
            elif not content:
                # 某些情况下 data 本身就是内容
                if isinstance(data, str):
                    content = data
                else:
                    content = str(data)

            return content
        except Exception as e:
            self.logger.error(f"解码 Gitee README 失败: {e}")
            return ""

    async def _request(self, path: str, params: dict = None) -> Optional[dict | list]:
        """统一 HTTP 请求方法

        使用 httpx.AsyncClient，处理速率限制。
        """
        url = f"{self.BASE_URL}{path}"
        params = params or {}

        max_retries = 3
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(
                    headers=self.headers,
                    timeout=10.0,
                ) as client:
                    response = await client.get(url, params=params)

                    # Gitee 速率限制通常返回 429 或 403
                    if response.status_code in (403, 429):
                        retry_after = response.headers.get("Retry-After")
                        wait_seconds = int(retry_after) if retry_after else 60

                        if attempt < max_retries - 1:
                            self.logger.warning(
                                f"Gitee API 速率限制，等待 {wait_seconds} 秒后重试 "
                                f"(attempt {attempt + 1}/{max_retries})"
                            )
                            await asyncio.sleep(wait_seconds)
                            continue
                        else:
                            self.logger.error("Gitee API 速率限制，已达最大重试次数")
                            return None

                    if response.status_code != 200:
                        self.logger.error(
                            f"Gitee API 请求失败: {url} -> {response.status_code} "
                            f"{response.text[:200]}"
                        )
                        return None

                    # Gitee 可能返回 JSON 对象或列表
                    try:
                        return response.json()
                    except Exception:
                        self.logger.error(f"Gitee API 返回非 JSON 数据: {url}")
                        return None

            except httpx.TimeoutException:
                self.logger.error(f"Gitee API 请求超时: {url}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2)
                    continue
                return None
            except Exception as e:
                self.logger.error(f"Gitee API 请求异常: {url} -> {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2)
                    continue
                return None

        return None

    def _parse_repo_item(self, item: dict, skill_type: str = "mcp_server") -> Optional[CrawlResult]:
        """将 Gitee API 返回的仓库数据解析为 CrawlResult

        Gitee 返回格式与 GitHub 类似但不完全相同，注意字段映射。
        """
        try:
            # Gitee 的 license 字段通常是字符串
            license_name = ""
            license_info = item.get("license")
            if isinstance(license_info, str):
                license_name = license_info
            elif isinstance(license_info, dict):
                license_name = license_info.get("spdx_id", "") or license_info.get("name", "")

            # Gitee 的 topics 字段
            topics = item.get("topics", [])
            tags = list(topics) if isinstance(topics, list) else []

            # 提取语言
            language = item.get("language", "") or ""
            if language and language.lower() not in [t.lower() for t in tags]:
                tags.append(language)

            # Gitee 使用 full_name 或 path 作为标识
            full_name = item.get("full_name", "") or item.get("path", "")
            if not full_name:
                # 尝试从 owner/login + path 拼接
                owner_info = item.get("owner", {})
                owner_login = owner_info.get("login", "") if isinstance(owner_info, dict) else ""
                repo_path = item.get("path", "")
                if owner_login and repo_path:
                    full_name = f"{owner_login}/{repo_path}"

            # Gitee 的 homepage 字段
            homepage = item.get("homepage", "") or ""

            # Gitee HTML URL
            html_url = item.get("html_url", "") or ""
            if not html_url and full_name:
                html_url = f"https://gitee.com/{full_name}"

            # 构建 gitee_url
            gitee_url = html_url

            # 构建 extra 信息
            extra = {
                "stars": item.get("stargazers_count", 0) or item.get("stars_count", 0) or 0,
                "forks": item.get("forks_count", 0) or 0,
                "language": language,
                "open_issues": item.get("open_issues_count", 0) or 0,
                "watchers": item.get("watchers_count", 0) or item.get("watchers", 0) or 0,
                "default_branch": item.get("default_branch", "master"),
                "created_at": item.get("created_at", ""),
                "updated_at": item.get("updated_at", ""),
                "pushed_at": item.get("pushed_at", ""),
            }

            # 获取 owner 信息
            owner_info = item.get("owner", {})
            author = owner_info.get("login", "") if isinstance(owner_info, dict) else ""
            if not author:
                author = item.get("owner", {}).get("name", "") if isinstance(item.get("owner"), dict) else ""

            # 获取 icon_url
            icon_url = owner_info.get("avatar_url", "") if isinstance(owner_info, dict) else ""

            return CrawlResult(
                name=item.get("name", "") or item.get("path", "").split("/")[-1],
                description=item.get("description", "") or "",
                author=author,
                gitee_url=gitee_url,
                homepage_url=homepage,
                tags=tags,
                license=license_name,
                icon_url=icon_url,
                skill_type=skill_type,
                source="gitee",
                source_id=full_name,
                extra=extra,
            )
        except Exception as e:
            self.logger.error(f"解析 Gitee 仓库数据失败: {e}")
            return None
