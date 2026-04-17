"""GitHub 采集器 — 通过 GitHub REST API v3 搜索和获取仓库信息"""
import asyncio
import base64
import logging
from typing import Optional

import httpx

from .base import BaseCrawler, CrawlResult

logger = logging.getLogger(__name__)


class GitHubCrawler(BaseCrawler):
    """GitHub 数据采集器"""

    BASE_URL = "https://api.github.com"

    # AI Tools 相关的搜索关键词
    SEARCH_QUERIES = [
        "mcp server",
        "model context protocol",
        "custom gpt actions",
        "ai agent tool",
        "llm tool calling",
        "ai prompt template",
        "openai plugin",
        "claude tool",
    ]

    # 搜索关键词 → tool_type 映射
    QUERY_TYPE_MAP = {
        "mcp server": "mcp_server",
        "model context protocol": "mcp_server",
        "custom gpt actions": "custom_gpt",
        "ai agent tool": "agent_tool",
        "llm tool calling": "agent_tool",
        "ai prompt template": "prompt_template",
        "openai plugin": "custom_gpt",
        "claude tool": "mcp_server",
    }

    def __init__(self, token: str = ""):
        super().__init__(token)
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "AI-Tools-Hub/1.0",
        }
        if token:
            self.headers["Authorization"] = f"token {token}"

    async def search(
        self,
        query: str,
        sort: str = "stars",
        per_page: int = 30,
        page: int = 1,
    ) -> list[CrawlResult]:
        """搜索 GitHub 仓库

        使用 /search/repositories 端点，添加 topic:ai 提高相关性。
        sort 支持: stars | updated | forks
        """
        # 构建搜索参数，添加 AI 相关 topic 提高结果相关性
        q = f"{query} topic:ai"
        params = {
            "q": q,
            "sort": sort,
            "order": "desc",
            "per_page": min(per_page, 100),  # GitHub 最大 100
            "page": page,
        }

        self.logger.info(f"搜索 GitHub: query='{q}', sort={sort}, page={page}")
        data = await self._request("/search/repositories", params=params)

        if not data or "items" not in data:
            self.logger.warning("GitHub 搜索返回空结果")
            return []

        results = []
        inferred_type = self.QUERY_TYPE_MAP.get(query.lower(), "mcp_server")
        for item in data["items"]:
            result = self._parse_repo_item(item, inferred_type)
            if result:
                results.append(result)

        self.logger.info(f"GitHub 搜索完成: 共 {len(results)} 条结果")
        return results

    async def get_repo_info(self, owner: str, repo: str) -> Optional[CrawlResult]:
        """获取单个仓库详情

        GET /repos/{owner}/{repo}
        """
        self.logger.info(f"获取 GitHub 仓库详情: {owner}/{repo}")
        data = await self._request(f"/repos/{owner}/{repo}")

        if not data:
            self.logger.warning(f"GitHub 仓库不存在: {owner}/{repo}")
            return None

        return self._parse_repo_item(data)

    async def get_readme(self, owner: str, repo: str) -> str:
        """获取 README 内容

        GET /repos/{owner}/{repo}/readme
        解码 base64 content
        """
        self.logger.info(f"获取 GitHub README: {owner}/{repo}")
        data = await self._request(f"/repos/{owner}/{repo}/readme")

        if not data or "content" not in data:
            self.logger.warning(f"GitHub README 不存在: {owner}/{repo}")
            return ""

        try:
            # GitHub 返回的 content 是 base64 编码，可能有换行符需要去除
            content_b64 = data["content"].replace("\n", "")
            content = base64.b64decode(content_b64).decode("utf-8", errors="replace")
            return content
        except Exception as e:
            self.logger.error(f"解码 GitHub README 失败: {e}")
            return ""

    async def _request(self, path: str, params: dict = None) -> Optional[dict]:
        """统一 HTTP 请求方法

        使用 httpx.AsyncClient，处理速率限制（403 时读取 Retry-After）。
        """
        url = f"{self.BASE_URL}{path}"

        # 最多重试 3 次
        max_retries = 3
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(
                    headers=self.headers,
                    timeout=10.0,
                ) as client:
                    response = await client.get(url, params=params)

                    # 检查速率限制
                    if response.status_code == 403:
                        # 尝试从 header 读取重试时间
                        retry_after = response.headers.get("Retry-After")
                        # 也检查 X-RateLimit-Remaining
                        remaining = response.headers.get("X-RateLimit-Remaining", "1")
                        reset_time = response.headers.get("X-RateLimit-Reset")

                        if retry_after:
                            wait_seconds = int(retry_after)
                        elif remaining == "0" and reset_time:
                            import time
                            wait_seconds = max(int(reset_time) - int(time.time()), 1)
                        else:
                            wait_seconds = 60  # 默认等待 60 秒

                        if attempt < max_retries - 1:
                            self.logger.warning(
                                f"GitHub API 速率限制，等待 {wait_seconds} 秒后重试 "
                                f"(attempt {attempt + 1}/{max_retries})"
                            )
                            await asyncio.sleep(wait_seconds)
                            continue
                        else:
                            self.logger.error("GitHub API 速率限制，已达最大重试次数")
                            return None

                    # 其他错误
                    if response.status_code != 200:
                        self.logger.error(
                            f"GitHub API 请求失败: {url} -> {response.status_code} "
                            f"{response.text[:200]}"
                        )
                        return None

                    return response.json()

            except httpx.TimeoutException:
                self.logger.error(f"GitHub API 请求超时: {url}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2)
                    continue
                return None
            except Exception as e:
                self.logger.error(f"GitHub API 请求异常: {url} -> {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2)
                    continue
                return None

        return None

    def _parse_repo_item(self, item: dict, tool_type: str = "mcp_server") -> Optional[CrawlResult]:
        """将 GitHub API 返回的仓库数据解析为 CrawlResult"""
        try:
            # 提取 license 信息
            license_info = item.get("license")
            license_name = ""
            if license_info and isinstance(license_info, dict):
                license_name = license_info.get("spdx_id", "")
                # spdx_id 为 "NOASSERTION" 时尝试用 name
                if not license_name or license_name == "NOASSERTION":
                    license_name = license_info.get("name", "")

            # 提取 topics 作为 tags
            topics = item.get("topics", [])
            tags = list(topics) if isinstance(topics, list) else []

            # 提取语言
            language = item.get("language", "") or ""

            # 将语言添加到 tags（如果存在且不重复）
            if language and language.lower() not in [t.lower() for t in tags]:
                tags.append(language)

            # 构建 extra 信息
            extra = {
                "stars": item.get("stargazers_count", 0) or 0,
                "forks": item.get("forks_count", 0) or 0,
                "language": language,
                "open_issues": item.get("open_issues_count", 0) or 0,
                "watchers": item.get("watchers_count", 0) or 0,
                "default_branch": item.get("default_branch", "main"),
                "created_at": item.get("created_at", ""),
                "updated_at": item.get("updated_at", ""),
                "pushed_at": item.get("pushed_at", ""),
            }

            # 获取 owner 信息
            owner_info = item.get("owner", {})
            author = owner_info.get("login", "") if isinstance(owner_info, dict) else ""

            # 获取 icon_url（使用 owner 的 avatar）
            icon_url = owner_info.get("avatar_url", "") if isinstance(owner_info, dict) else ""

            return CrawlResult(
                name=item.get("name", ""),
                description=item.get("description", "") or "",
                author=author,
                github_url=item.get("html_url", ""),
                homepage_url=item.get("homepage", "") or "",
                tags=tags,
                license=license_name,
                icon_url=icon_url,
                tool_type=tool_type,
                source="github",
                source_id=item.get("full_name", ""),
                extra=extra,
            )
        except Exception as e:
            self.logger.error(f"解析 GitHub 仓库数据失败: {e}")
            return None
