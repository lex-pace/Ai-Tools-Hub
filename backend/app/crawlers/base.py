"""采集器抽象基类"""
import logging
from abc import ABC, abstractmethod
from typing import Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class CrawlResult:
    """单条采集结果"""
    name: str
    description: str
    detail: str = ""
    skill_type: str = "mcp_server"  # mcp_server | custom_gpt | agent_skill | prompt_template
    platforms: list = field(default_factory=list)
    tags: list = field(default_factory=list)
    author: str = ""
    version: str = ""
    license: str = ""
    github_url: str = ""
    homepage_url: str = ""
    gitee_url: str = ""
    icon_url: str = ""
    screenshots: list = field(default_factory=list)
    install_guide: str = ""
    usage_examples: str = ""
    source: str = ""        # github | gitee
    source_id: str = ""     # 唯一标识（如 repo full_name）
    extra: dict = field(default_factory=dict)  # 额外数据（stars, forks 等）


class BaseCrawler(ABC):
    """采集器抽象基类"""

    def __init__(self, token: str = ""):
        self.token = token
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    @abstractmethod
    async def search(self, query: str, sort: str = "stars", per_page: int = 30, page: int = 1) -> list[CrawlResult]:
        """搜索项目"""
        pass

    @abstractmethod
    async def get_repo_info(self, owner: str, repo: str) -> Optional[CrawlResult]:
        """获取单个仓库详情"""
        pass

    @abstractmethod
    async def get_readme(self, owner: str, repo: str) -> str:
        """获取 README 内容"""
        pass
