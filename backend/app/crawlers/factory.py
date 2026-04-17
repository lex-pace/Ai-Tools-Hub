"""采集器工厂 — 根据 CRAWL_PROVIDER 配置创建对应实例"""
from app.core.config import settings
from .base import BaseCrawler


def get_crawler() -> BaseCrawler:
    """获取当前配置的采集器实例

    根据 settings.CRAWL_PROVIDER 配置创建对应的采集器。
    支持: github | gitee
    """
    provider = settings.CRAWL_PROVIDER
    if provider == "github":
        from .github_crawler import GitHubCrawler
        return GitHubCrawler(token=settings.GITHUB_TOKEN)
    elif provider == "gitee":
        from .gitee_crawler import GiteeCrawler
        return GiteeCrawler(token=settings.GITEE_TOKEN)
    else:
        raise ValueError(f"不支持的采集器: {provider}")


def get_all_crawlers() -> list[BaseCrawler]:
    """获取所有已配置 token 的采集器

    遍历所有采集器类型，如果对应 token 已配置则创建实例。
    """
    crawlers = []
    if settings.GITHUB_TOKEN:
        from .github_crawler import GitHubCrawler
        crawlers.append(GitHubCrawler(token=settings.GITHUB_TOKEN))
    if settings.GITEE_TOKEN:
        from .gitee_crawler import GiteeCrawler
        crawlers.append(GiteeCrawler(token=settings.GITEE_TOKEN))
    return crawlers
