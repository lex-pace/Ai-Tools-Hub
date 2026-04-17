"""AI Skills Hub — 配置管理（支持多环境）"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── 开发模式 ─────────────────────────────────────
    # docker = 全部在 Docker 中运行
    # local  = 基础设施在 Docker，代码在本地 IDE 运行
    APP_MODE: str = "docker"
    APP_SECRET: str = "change-me"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True

    # ── Provider 选择 ────────────────────────────────
    LLM_PROVIDER: str = "siliconcloud"
    EMBEDDING_PROVIDER: str = "siliconcloud"
    CRAWL_PROVIDER: str = "gitee"

    # ── SiliconCloud ─────────────────────────────────
    SILICONFLOW_API_KEY: str = ""
    SILICONFLOW_BASE_URL: str = "https://api.siliconflow.cn/v1"
    SILICONFLOW_LLM_MODEL: str = "Qwen/Qwen2.5-7B-Instruct"
    SILICONFLOW_EMBEDDING_MODEL: str = "BAAI/bge-m3"

    # ── Google Gemini ────────────────────────────────
    GOOGLE_GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # ── Groq ─────────────────────────────────────────
    GROQ_API_KEY: str = ""
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # ── 百度千帆 ─────────────────────────────────────
    BAIDU_API_KEY: str = ""
    BAIDU_SECRET_KEY: str = ""
    BAIDU_MODEL: str = "ernie-speed-128k"

    # ── DeepSeek ─────────────────────────────────────
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com/v1"
    DEEPSEEK_MODEL: str = "deepseek-chat"

    # ── 本地 Embedding ───────────────────────────────
    LOCAL_EMBEDDING_MODEL: str = "BAAI/bge-small-zh-v1.5"
    LOCAL_EMBEDDING_DEVICE: str = "cpu"

    # ── 数据采集 ─────────────────────────────────────
    GITHUB_TOKEN: str = ""
    GITEE_TOKEN: str = ""

    # ── API 限流 ─────────────────────────────────────
    RATE_LIMIT_ENABLED: bool = False
    RATE_LIMIT_SEARCH_PER_MINUTE: int = 300
    RATE_LIMIT_CRAWL_PER_MINUTE: int = 60
    RATE_LIMIT_DEFAULT_PER_MINUTE: int = 600

    # ── 连接配置（多环境）────────────────────────────
    DOCKER_HOST: str = "192.168.1.100"

    # Docker 内部地址（容器名）
    DB_HOST_DOCKER: str = "postgres"
    DB_PORT_DOCKER: int = 5432
    REDIS_HOST_DOCKER: str = "redis"
    REDIS_PORT_DOCKER: int = 6379
    ES_HOST_DOCKER: str = "elasticsearch"
    ES_PORT_DOCKER: int = 9200

    # 本地开发地址（VM 局域网 IP）
    DB_HOST_LOCAL: str = "192.168.1.100"
    DB_PORT_LOCAL: int = 5432
    REDIS_HOST_LOCAL: str = "192.168.1.100"
    REDIS_PORT_LOCAL: int = 6379
    ES_HOST_LOCAL: str = "192.168.1.100"
    ES_PORT_LOCAL: int = 9200

    # ── 计算属性（根据 APP_MODE 自动选择）────────────
    @property
    def DATABASE_URL(self) -> str:
        if self.APP_MODE == "docker":
            host = self.DB_HOST_DOCKER
            port = self.DB_PORT_DOCKER
        else:
            host = self.DB_HOST_LOCAL
            port = self.DB_PORT_LOCAL
        return f"postgresql+asyncpg://skills:skills123@{host}:{port}/skills_hub"

    @property
    def SYNC_DATABASE_URL(self) -> str:
        if self.APP_MODE == "docker":
            host = self.DB_HOST_DOCKER
            port = self.DB_PORT_DOCKER
        else:
            host = self.DB_HOST_LOCAL
            port = self.DB_PORT_LOCAL
        return f"postgresql://skills:skills123@{host}:{port}/skills_hub"

    @property
    def REDIS_URL(self) -> str:
        if self.APP_MODE == "docker":
            host = self.REDIS_HOST_DOCKER
            port = self.REDIS_PORT_DOCKER
        else:
            host = self.REDIS_HOST_LOCAL
            port = self.REDIS_PORT_LOCAL
        return f"redis://{host}:{port}/0"

    @property
    def ELASTICSEARCH_URL(self) -> str:
        if self.APP_MODE == "docker":
            host = self.ES_HOST_DOCKER
            port = self.ES_PORT_DOCKER
        else:
            host = self.ES_HOST_LOCAL
            port = self.ES_PORT_LOCAL
        return f"http://{host}:{port}"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
