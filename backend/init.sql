-- ============================================================
-- AI Tools Hub — 数据库初始化脚本
-- 由 PostgreSQL 容器首次启动时自动执行
-- ============================================================

-- 启用必要扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- 分类表
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
    level       INTEGER NOT NULL DEFAULT 1,
    icon        VARCHAR(50),
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active);

-- ============================================================
-- Tools 主表
-- ============================================================
CREATE TABLE IF NOT EXISTS tools (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(200) NOT NULL UNIQUE,
    description     TEXT NOT NULL,
    detail          TEXT,
    tool_type      VARCHAR(50) NOT NULL DEFAULT 'mcp_server',
    platforms       JSONB NOT NULL DEFAULT '[]',
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    tags            JSONB NOT NULL DEFAULT '[]',
    author          VARCHAR(200),
    version         VARCHAR(50),
    license         VARCHAR(50),
    github_url      VARCHAR(500),
    homepage_url    VARCHAR(500),
    gitee_url       VARCHAR(500),
    icon_url        VARCHAR(500),
    screenshots     JSONB DEFAULT '[]',
    install_guide   TEXT,
    usage_examples  TEXT,
    quality_score   DECIMAL(3,2) DEFAULT 0,
    usage_count     INTEGER DEFAULT 0,
    favorite_count  INTEGER DEFAULT 0,
    source          VARCHAR(50) NOT NULL DEFAULT 'manual',
    source_id       VARCHAR(200),
    status          VARCHAR(20) DEFAULT 'active',
    is_featured     BOOLEAN DEFAULT FALSE,
    -- 商业化预留字段
    is_premium      BOOLEAN DEFAULT FALSE,
    is_paid         BOOLEAN DEFAULT FALSE,
    price           DECIMAL(10,2) DEFAULT 0,
    is_verified     BOOLEAN DEFAULT FALSE,
    verified_at     TIMESTAMP,
    is_sponsored    BOOLEAN DEFAULT FALSE,
    sponsor_info    JSONB,
    developer_id    UUID,
    published_at    TIMESTAMP,
    last_synced_at  TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tools_type ON tools(tool_type);
CREATE INDEX idx_tools_platforms ON tools USING GIN(platforms);
CREATE INDEX idx_tools_category ON tools(category_id);
CREATE INDEX idx_tools_tags ON tools USING GIN(tags);
CREATE INDEX idx_tools_quality ON tools(quality_score DESC);
CREATE INDEX idx_tools_usage ON tools(usage_count DESC);
CREATE INDEX idx_tools_status ON tools(status);
CREATE INDEX idx_tools_created ON tools(created_at DESC);
CREATE INDEX idx_tools_source ON tools(source, source_id);

-- ============================================================
-- 用户表
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(100) NOT NULL UNIQUE,
    email           VARCHAR(200) NOT NULL UNIQUE,
    password_hash   VARCHAR(200) NOT NULL,
    avatar_url      VARCHAR(500),
    role            VARCHAR(20) DEFAULT 'user',
    tier            VARCHAR(20) DEFAULT 'free',
    tier_expires_at TIMESTAMP,
    preferences     JSONB DEFAULT '{}',
    is_active       BOOLEAN DEFAULT TRUE,
    last_login_at   TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 收藏表
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tool_id    UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    group_name  VARCHAR(100) DEFAULT '默认收藏夹',
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, tool_id, group_name)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);

-- ============================================================
-- 评价表
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tool_id    UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment     TEXT,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, tool_id)
);

CREATE INDEX idx_reviews_tool ON reviews(tool_id);

-- ============================================================
-- 搜索日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS search_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query           TEXT NOT NULL,
    query_type      VARCHAR(20) DEFAULT 'keyword',
    results_count   INTEGER DEFAULT 0,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    filters         JSONB DEFAULT '{}',
    ip_address      VARCHAR(50),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_search_logs_created ON search_logs(created_at DESC);

-- ============================================================
-- 采集任务表
-- ============================================================
CREATE TABLE IF NOT EXISTS crawl_tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    source_type     VARCHAR(50) NOT NULL,
    source_config   JSONB NOT NULL,
    schedule        VARCHAR(50),
    status          VARCHAR(20) DEFAULT 'active',
    last_run_at     TIMESTAMP,
    last_result     JSONB,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 开发者账户表（商业化预留）
-- ============================================================
CREATE TABLE IF NOT EXISTS developer_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_verified     BOOLEAN DEFAULT FALSE,
    payout_method   VARCHAR(50),
    payout_account  VARCHAR(200),
    total_earnings  DECIMAL(10,2) DEFAULT 0,
    pending_payout  DECIMAL(10,2) DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 收益记录表（商业化预留）
-- ============================================================
CREATE TABLE IF NOT EXISTS earnings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    developer_id    UUID NOT NULL REFERENCES developer_accounts(id) ON DELETE CASCADE,
    tool_id        UUID REFERENCES tools(id) ON DELETE SET NULL,
    source          VARCHAR(50) NOT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',
    settled_at      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 插入默认分类数据（AI Tools Hub 分类体系）
-- ============================================================
-- 先清理旧分类（如果存在）
DELETE FROM tools WHERE source = 'seed';
DELETE FROM categories;

-- 一级分类（8 个）
INSERT INTO categories (name, slug, description, icon, level, sort_order) VALUES
    ('MCP 工具', 'mcp-tools', 'Model Context Protocol 生态工具，包括 MCP Server、Client 和工具集', 'plug', 1, 1),
    ('AI Agent', 'ai-agent', '智能体框架、Agent 工具和多智能体系统', 'bot', 1, 2),
    ('Prompt 工程', 'prompt-engineering', '提示词模板、Prompt 优化工具和 Prompt IDE', 'wand2', 1, 3),
    ('LLM 框架', 'llm-framework', 'LangChain、LlamaIndex、Semantic Kernel 等 LLM 开发框架', 'workflow', 1, 4),
    ('RAG 工具', 'rag-tools', '向量数据库、Embedding 模型、文档解析等检索增强生成工具', 'database', 1, 5),
    ('AI 编程', 'ai-coding', 'AI 辅助编程工具，包括代码生成、审查、Copilot 等', 'code', 1, 6),
    ('AI 创作', 'ai-creation', 'AI 内容创作工具，包括文案、图像、音频、视频生成', 'sparkles', 1, 7),
    ('GPTs & 插件', 'gpts-plugins', 'Custom GPT、OpenAI 插件、Claude 工具等平台专属工具', 'messageSquare', 1, 8);

-- MCP 工具二级分类
INSERT INTO categories (name, slug, description, parent_id, icon, level, sort_order)
SELECT v.name, v.slug, v.cat_desc, c.id, v.icon, 2, v.ord
FROM categories c
CROSS JOIN (VALUES
    ('MCP Server', 'mcp-server', 'MCP 协议服务端实现，为 AI 模型提供工具和资源', 'plug', 'mcp-tools', 1),
    ('MCP Client', 'mcp-client', 'MCP 协议客户端，连接 AI 模型与 MCP Server', 'plug', 'mcp-tools', 2),
    ('MCP 工具集', 'mcp-toolkit', '集成多个 MCP Server 的工具集合和配置方案', 'plug', 'mcp-tools', 3)
) AS v(name, slug, cat_desc, icon, parent_slug, ord)
WHERE c.slug = v.parent_slug AND c.level = 1;

-- AI Agent 二级分类
INSERT INTO categories (name, slug, description, parent_id, icon, level, sort_order)
SELECT v.name, v.slug, v.cat_desc, c.id, v.icon, 2, v.ord
FROM categories c
CROSS JOIN (VALUES
    ('Agent 框架', 'agent-framework', 'AutoGen、CrewAI、LangGraph 等智能体开发框架', 'bot', 'ai-agent', 1),
    ('Agent 工具', 'agent-tool', '为 AI Agent 提供具体能力的工具（搜索、代码执行、文件操作等）', 'bot', 'ai-agent', 2),
    ('Multi-Agent', 'multi-agent', '多智能体协作系统，支持 Agent 间通信与任务分配', 'bot', 'ai-agent', 3)
) AS v(name, slug, cat_desc, icon, parent_slug, ord)
WHERE c.slug = v.parent_slug AND c.level = 1;

-- Prompt 工程二级分类
INSERT INTO categories (name, slug, description, parent_id, icon, level, sort_order)
SELECT v.name, v.slug, v.cat_desc, c.id, v.icon, 2, v.ord
FROM categories c
CROSS JOIN (VALUES
    ('Prompt 模板', 'prompt-template', '经过验证的高质量提示词模板，可直接使用', 'wand2', 'prompt-engineering', 1),
    ('Prompt 优化', 'prompt-optimizer', '自动优化和调试 Prompt 的工具', 'wand2', 'prompt-engineering', 2),
    ('Prompt IDE', 'prompt-ide', '可视化 Prompt 编辑、测试和版本管理工具', 'wand2', 'prompt-engineering', 3)
) AS v(name, slug, cat_desc, icon, parent_slug, ord)
WHERE c.slug = v.parent_slug AND c.level = 1;

-- LLM 框架二级分类
INSERT INTO categories (name, slug, description, parent_id, icon, level, sort_order)
SELECT v.name, v.slug, v.cat_desc, c.id, v.icon, 2, v.ord
FROM categories c
CROSS JOIN (VALUES
    ('LangChain', 'langchain', 'LangChain 及 LangGraph 生态系统工具', 'workflow', 'llm-framework', 1),
    ('LlamaIndex', 'llamaindex', 'LlamaIndex 数据框架和索引工具', 'workflow', 'llm-framework', 2),
    ('Semantic Kernel', 'semantic-kernel', '微软 Semantic Kernel SDK 和插件', 'workflow', 'llm-framework', 3)
) AS v(name, slug, cat_desc, icon, parent_slug, ord)
WHERE c.slug = v.parent_slug AND c.level = 1;

-- RAG 工具二级分类
INSERT INTO categories (name, slug, description, parent_id, icon, level, sort_order)
SELECT v.name, v.slug, v.cat_desc, c.id, v.icon, 2, v.ord
FROM categories c
CROSS JOIN (VALUES
    ('向量数据库', 'vector-database', 'Pinecone、Milvus、Chroma、Weaviate 等向量存储', 'database', 'rag-tools', 1),
    ('Embedding', 'embedding', '文本向量化模型和 Embedding API', 'database', 'rag-tools', 2),
    ('文档解析', 'document-parser', 'PDF、Word、HTML 等文档解析和分块工具', 'database', 'rag-tools', 3)
) AS v(name, slug, cat_desc, icon, parent_slug, ord)
WHERE c.slug = v.parent_slug AND c.level = 1;

-- AI 编程二级分类
INSERT INTO categories (name, slug, description, parent_id, icon, level, sort_order)
SELECT v.name, v.slug, v.cat_desc, c.id, v.icon, 2, v.ord
FROM categories c
CROSS JOIN (VALUES
    ('代码生成', 'code-generation', 'AI 代码生成工具和补全插件', 'code', 'ai-coding', 1),
    ('代码审查', 'code-review', 'AI 驱动的代码质量分析和安全审计', 'code', 'ai-coding', 2),
    ('Copilot 工具', 'copilot-tool', 'GitHub Copilot、Cursor 等 AI 编程助手', 'code', 'ai-coding', 3)
) AS v(name, slug, cat_desc, icon, parent_slug, ord)
WHERE c.slug = v.parent_slug AND c.level = 1;

-- AI 创作二级分类
INSERT INTO categories (name, slug, description, parent_id, icon, level, sort_order)
SELECT v.name, v.slug, v.cat_desc, c.id, v.icon, 2, v.ord
FROM categories c
CROSS JOIN (VALUES
    ('文案写作', 'copywriting', 'AI 文案生成、营销内容和创意写作', 'sparkles', 'ai-creation', 1),
    ('图像生成', 'image-generation', 'Stable Diffusion、DALL-E、Midjourney 等图像生成工具', 'image', 'ai-creation', 2),
    ('音频生成', 'audio-generation', 'TTS 语音合成、音乐生成和音频处理', 'image', 'ai-creation', 3)
) AS v(name, slug, cat_desc, icon, parent_slug, ord)
WHERE c.slug = v.parent_slug AND c.level = 1;

-- GPTs & 插件二级分类
INSERT INTO categories (name, slug, description, parent_id, icon, level, sort_order)
SELECT v.name, v.slug, v.cat_desc, c.id, v.icon, 2, v.ord
FROM categories c
CROSS JOIN (VALUES
    ('Custom GPT', 'custom-gpt', 'ChatGPT 自定义 GPT 和 Actions', 'messageSquare', 'gpts-plugins', 1),
    ('OpenAI 插件', 'openai-plugin', 'OpenAI ChatGPT 插件和扩展', 'messageSquare', 'gpts-plugins', 2),
    ('Claude 工具', 'claude-tool', 'Claude 扩展工具和集成方案', 'messageSquare', 'gpts-plugins', 3)
) AS v(name, slug, cat_desc, icon, parent_slug, ord)
WHERE c.slug = v.parent_slug AND c.level = 1;

-- ============================================================
-- 插入种子 Tools 数据（25 条，适配新分类体系）
-- ============================================================
INSERT INTO tools (name, slug, description, detail, tool_type, platforms, category_id, tags, author, version, license, github_url, homepage_url, icon_url, quality_score, usage_count, favorite_count, source, status, is_featured, install_guide, usage_examples) VALUES
-- 1. MCP Server: filesystem
('Filesystem MCP Server', 'filesystem-mcp-server',
 '基于 MCP 协议的文件系统服务器，支持文件读写、目录浏览等功能',
 'Filesystem MCP Server 允许 AI 模型安全地访问本地文件系统。支持文件读写、目录创建与浏览、文件搜索等操作，并提供细粒度的权限控制。适用于需要处理本地文件的各类 AI 应用场景。',
 'mcp_server', '["openai", "anthropic", "google", "mistral"]',
 (SELECT id FROM categories WHERE slug = 'mcp-server' LIMIT 1),
 '["filesystem", "mcp", "file-management", "local-files"]',
 'Anthropic', '1.0.0', 'MIT',
 'https://github.com/modelcontextprotocol/servers',
 'https://modelcontextprotocol.io',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/visualstudiocode.png',
 0.92, 15800, 3200, 'seed', 'active', TRUE,
 '在 MCP 配置文件中添加 filesystem 服务器配置，指定允许访问的目录路径即可。',
 '场景一：让 AI 读取本地项目文件并进行分析。场景二：通过 AI 自动生成配置文件并写入指定目录。'),

-- 2. MCP Server: github
('GitHub MCP Server', 'github-mcp-server',
 '通过 MCP 协议与 GitHub API 交互，支持仓库管理、Issue 处理、PR 操作',
 'GitHub MCP Server 提供了对 GitHub API 的完整封装，支持仓库管理、Issue 创建与追踪、Pull Request 操作、代码搜索等功能。让 AI 助手能够直接参与 GitHub 工作流，提升开发协作效率。',
 'mcp_server', '["openai", "anthropic", "google"]',
 (SELECT id FROM categories WHERE slug = 'mcp-server' LIMIT 1),
 '["github", "mcp", "repository", "issues", "pull-requests"]',
 'GitHub', '1.2.0', 'MIT',
 'https://github.com/modelcontextprotocol/servers',
 'https://modelcontextprotocol.io',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/github.png',
 0.95, 22400, 5100, 'seed', 'active', TRUE,
 '配置 GitHub Personal Access Token，在 MCP 配置中添加 github 服务器，设置所需权限范围。',
 '场景一：让 AI 自动创建 Issue 并分配给团队成员。场景二：通过 AI 审查 Pull Request 代码变更。'),

-- 3. MCP Server: postgres
('PostgreSQL MCP Server', 'postgres-mcp-server',
 '基于 MCP 协议的 PostgreSQL 数据库服务器，支持 SQL 查询与数据库管理',
 'PostgreSQL MCP Server 允许 AI 模型安全地执行 SQL 查询、管理数据库表结构、查看数据库元信息。支持只读模式和受限查询，确保数据安全。是数据分析与数据库管理场景的理想工具。',
 'mcp_server', '["openai", "anthropic", "google", "mistral"]',
 (SELECT id FROM categories WHERE slug = 'mcp-server' LIMIT 1),
 '["postgresql", "mcp", "database", "sql", "data"]',
 'ModelContextProtocol', '0.6.0', 'MIT',
 'https://github.com/modelcontextprotocol/servers',
 'https://modelcontextprotocol.io',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/postgresql.png',
 0.88, 9600, 2100, 'seed', 'active', TRUE,
 '安装后配置数据库连接字符串，设置允许执行的 SQL 权限级别，添加到 MCP 服务器列表。',
 '场景一：让 AI 查询数据库并生成数据报表。场景二：通过自然语言描述让 AI 自动编写复杂 SQL 查询。'),

-- 4. MCP Server: brave-search
('Brave Search MCP Server', 'brave-search-mcp-server',
 '通过 MCP 协议接入 Brave Search API，提供网页搜索与摘要功能',
 'Brave Search MCP Server 将 Brave Search 的能力集成到 AI 工作流中。支持网页搜索、本地搜索、自动摘要等功能，帮助 AI 获取实时网络信息。',
 'mcp_server', '["openai", "anthropic", "google"]',
 (SELECT id FROM categories WHERE slug = 'mcp-server' LIMIT 1),
 '["search", "mcp", "brave", "web-search", "api"]',
 'Brave', '1.1.0', 'MIT',
 'https://github.com/modelcontextprotocol/servers',
 'https://brave.com/search/api/',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/brave.png',
 0.85, 7200, 1800, 'seed', 'active', FALSE,
 '申请 Brave Search API Key，在 MCP 配置中添加 brave-search 服务器并填入 API Key。',
 '场景一：让 AI 搜索最新技术文档并总结关键信息。场景二：通过 AI 进行竞品分析。'),

-- 5. MCP Server: puppeteer
('Puppeteer MCP Server', 'puppeteer-mcp-server',
 '基于 MCP 协议的浏览器自动化服务器，支持网页截图、PDF 生成、爬虫',
 'Puppeteer MCP Server 将 Puppeteer 浏览器自动化能力暴露给 AI 模型。支持网页导航、截图、PDF 生成、表单填写、数据抓取等操作。',
 'mcp_server', '["openai", "anthropic", "google"]',
 (SELECT id FROM categories WHERE slug = 'mcp-server' LIMIT 1),
 '["puppeteer", "mcp", "browser", "automation", "scraping"]',
 'ModelContextProtocol', '0.5.0', 'MIT',
 'https://github.com/modelcontextprotocol/servers',
 'https://modelcontextprotocol.io',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/puppeteer.png',
 0.87, 6800, 1500, 'seed', 'active', FALSE,
 '安装 Puppeteer MCP Server，配置浏览器启动参数和允许访问的域名白名单。',
 '场景一：让 AI 自动截取网页并分析页面布局。场景二：通过 AI 自动填写表单并提交数据。'),

-- 6. MCP Server: memory
('Memory MCP Server', 'memory-mcp-server',
 '基于 MCP 协议的知识图谱记忆服务器，支持持久化知识存储与检索',
 'Memory MCP Server 为 AI 提供持久化的知识存储能力，基于知识图谱实现实体关系建模。支持知识的创建、更新、删除和语义检索，让 AI 在多轮对话中保持上下文记忆。',
 'mcp_server', '["openai", "anthropic", "google", "mistral"]',
 (SELECT id FROM categories WHERE slug = 'mcp-server' LIMIT 1),
 '["memory", "mcp", "knowledge-graph", "rag", "storage"]',
 'ModelContextProtocol', '0.7.0', 'MIT',
 'https://github.com/modelcontextprotocol/servers',
 'https://modelcontextprotocol.io',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/memory.png',
 0.86, 7800, 1700, 'seed', 'active', FALSE,
 '安装 Memory MCP Server，配置存储后端（支持文件系统和向量数据库），添加到 MCP 配置。',
 '场景一：让 AI 记住用户偏好并在后续对话中自动应用。场景二：构建项目知识库。'),

-- 7. MCP Server: slack
('Slack MCP Server', 'slack-mcp-server',
 '通过 MCP 协议接入 Slack 工作区，支持消息收发与频道管理',
 'Slack MCP Server 将 Slack 的核心功能集成到 AI 工作流中，支持发送消息、读取频道历史、管理频道成员、搜索消息等操作。',
 'mcp_server', '["openai", "anthropic"]',
 (SELECT id FROM categories WHERE slug = 'mcp-server' LIMIT 1),
 '["slack", "mcp", "messaging", "team-collaboration"]',
 'Slack Community', '0.8.0', 'MIT',
 'https://github.com/modelcontextprotocol/servers',
 'https://modelcontextprotocol.io',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/slack.png',
 0.83, 5400, 1200, 'seed', 'active', FALSE,
 '创建 Slack App 并获取 Bot Token，在 MCP 配置中添加 Slack 服务器。',
 '场景一：让 AI 自动回复 Slack 频道中的常见问题。场景二：通过 AI 汇总 Slack 讨论内容。'),

-- 8. Custom GPT: 代码助手
('代码助手 Pro', 'code-assistant-pro',
 '专业的编程辅助 GPT，支持多语言代码生成、重构与优化',
 '代码助手 Pro 是一个强大的编程辅助工具，精通 Python、JavaScript、TypeScript、Go、Rust 等主流编程语言。能够理解复杂需求生成高质量代码，进行代码重构和性能优化。',
 'custom_gpt', '["openai"]',
 (SELECT id FROM categories WHERE slug = 'custom-gpt' LIMIT 1),
 '["coding", "code-generation", "refactoring", "multi-language"]',
 'OpenAI Community', '2.0.0', 'MIT',
 'https://github.com/openai/chatgpt-retrieval-plugin',
 'https://chat.openai.com',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openai.png',
 0.96, 35000, 8900, 'seed', 'active', TRUE,
 '在 ChatGPT 中搜索"代码助手 Pro"并添加到对话，或通过 API 配置自定义 GPT 端点。',
 '场景一：描述需求让 AI 生成完整的 REST API 代码。场景二：粘贴遗留代码让 AI 进行现代化重构。'),

-- 9. Custom GPT: 翻译专家
('翻译专家 GPT', 'translation-expert-gpt',
 '专业级多语言翻译助手，支持语境感知与本地化翻译',
 '翻译专家 GPT 提供专业级的多语言翻译服务，支持中、英、日、韩、法、德等 20+ 种语言。能够根据上下文语境进行精准翻译，保留原文风格和语气。',
 'custom_gpt', '["openai", "anthropic", "google"]',
 (SELECT id FROM categories WHERE slug = 'custom-gpt' LIMIT 1),
 '["translation", "multilingual", "localization", "nlp"]',
 'Localization Lab', '1.8.0', 'MIT',
 'https://github.com/openai/chatgpt-retrieval-plugin',
 'https://chat.openai.com',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googletranslate.png',
 0.93, 27200, 6500, 'seed', 'active', TRUE,
 '在 ChatGPT 中搜索"翻译专家 GPT"，选择目标语言后粘贴或输入待翻译内容。',
 '场景一：将技术文档翻译为英文并保持专业术语准确。场景二：翻译营销文案并进行本地化适配。'),

-- 10. Custom GPT: 写作助手
('写作助手 GPT', 'writing-assistant-gpt',
 '全能型写作辅助工具，覆盖文案、小说、报告等多种文体',
 '写作助手 GPT 是一款全能型写作辅助工具，擅长各类文体的创作与优化。从营销文案到学术论文，从短篇小说到商业报告，都能提供专业级的写作支持。',
 'custom_gpt', '["openai", "anthropic"]',
 (SELECT id FROM categories WHERE slug = 'custom-gpt' LIMIT 1),
 '["writing", "copywriting", "content-creation", "editing"]',
 'Content Studio', '2.2.0', 'MIT',
 'https://github.com/openai/chatgpt-retrieval-plugin',
 'https://chat.openai.com',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/notion.png',
 0.89, 21000, 5300, 'seed', 'active', FALSE,
 '在 ChatGPT 中搜索"写作助手 GPT"，选择写作类型和风格，输入主题即可生成内容。',
 '场景一：输入产品特点让 AI 生成多版本广告文案。场景二：提供大纲让 AI 扩展为完整的博客文章。'),

-- 11. Agent: AutoGen
('AutoGen - Multi-Agent Framework', 'autogen-multi-agent',
 '微软开源的多智能体对话框架，支持 Agent 协作与代码执行',
 'AutoGen 是微软推出的开源多智能体框架，支持创建可定制的 AI Agent，实现 Agent 间的对话协作、代码执行、工具调用等。内置多种预设 Agent 模板，支持自定义 Agent 行为和工作流。',
 'agent_tool', '["openai", "anthropic"]',
 (SELECT id FROM categories WHERE slug = 'agent-framework' LIMIT 1),
 '["autogen", "multi-agent", "collaboration", "code-execution", "microsoft"]',
 'Microsoft', '0.4.0', 'MIT',
 'https://github.com/microsoft/autogen',
 'https://microsoft.github.io/autogen/',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/microsoft.png',
 0.94, 28600, 7200, 'seed', 'active', TRUE,
 'pip install autogen-agentchat，配置 LLM API Key，创建 Agent 并启动对话。',
 '场景一：创建两个 Agent 协作完成代码编写和测试。场景二：构建多 Agent 研究助手团队。'),

-- 12. Agent: CrewAI
('CrewAI - Agent 编排框架', 'crewai-agent-orchestration',
 '强大的 AI Agent 编排框架，支持角色定义、任务分配和团队协作',
 'CrewAI 是一个专注于 AI Agent 团队协作的编排框架。支持定义 Agent 角色、分配任务、设置工具，并自动协调 Agent 间的协作流程。适用于构建复杂的 AI 工作流自动化系统。',
 'agent_tool', '["openai", "anthropic", "google"]',
 (SELECT id FROM categories WHERE slug = 'agent-framework' LIMIT 1),
 '["crewai", "agent", "orchestration", "role-playing", "workflow"]',
 'CrewAI Inc.', '0.28.0', 'MIT',
 'https://github.com/crewAIInc/crewAI',
 'https://crewai.com',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/crewai.png',
 0.91, 19200, 4800, 'seed', 'active', TRUE,
 'pip install crewai，定义 Agent 和 Task，创建 Crew 并启动执行。',
 '场景一：创建研究团队 Agent 自动完成市场调研报告。场景二：构建内容创作流水线。'),

-- 13. Agent: LangGraph
('LangGraph - Agent 工作流框架', 'langgraph-agent-workflow',
 '基于图结构的 Agent 工作流框架，支持复杂状态管理和循环推理',
 'LangGraph 是 LangChain 团队推出的图结构 Agent 框架，支持构建有状态的、多步骤的 AI Agent 工作流。支持循环推理、分支逻辑、人机协作等高级特性。',
 'agent_tool', '["openai", "anthropic", "google"]',
 (SELECT id FROM categories WHERE slug = 'agent-framework' LIMIT 1),
 '["langgraph", "agent", "workflow", "state-machine", "langchain"]',
 'LangChain', '0.2.0', 'MIT',
 'https://github.com/langchain-ai/langgraph',
 'https://langchain-ai.github.io/langgraph/',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/langchain.png',
 0.93, 22400, 5600, 'seed', 'active', TRUE,
 'pip install langgraph，定义图节点和边，编译并执行工作流。',
 '场景一：构建带人工审核的 AI 客服工作流。场景二：实现多步骤的研究和分析 Agent。'),

-- 14. Prompt Template: SEO 优化
('SEO 内容优化 Prompt', 'seo-content-optimization-prompt',
 '专业的 SEO 内容优化提示词模板，提升网页搜索排名',
 'SEO 内容优化 Prompt 提供了一套经过验证的 SEO 优化提示词模板，涵盖关键词布局、Meta 描述优化、标题标签优化、内容结构优化等方面。',
 'prompt_template', '["openai", "anthropic", "google", "mistral"]',
 (SELECT id FROM categories WHERE slug = 'prompt-template' LIMIT 1),
 '["seo", "prompt", "optimization", "content-strategy", "keywords"]',
 'SEO Prompt Lab', '3.0.0', 'CC0',
 'https://github.com/dair-ai/Prompt-Engineering-Guide',
 'https://promptingguide.ai',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/google.png',
 0.88, 14200, 3600, 'seed', 'active', TRUE,
 '复制 Prompt 模板到 AI 对话中，替换占位符为实际的关键词和内容主题。',
 '场景一：输入产品页面内容，让 AI 优化关键词密度和标题结构。'),

-- 15. Prompt Template: 摘要提取
('长文摘要提取 Prompt', 'long-text-summarization-prompt',
 '高效的长文本摘要提取模板，支持多级摘要与关键信息提炼',
 '长文摘要提取 Prompt 专为处理长篇内容设计，支持多级摘要（详细摘要、简短摘要、一句话总结）和关键信息提取。',
 'prompt_template', '["openai", "anthropic", "google", "mistral"]',
 (SELECT id FROM categories WHERE slug = 'prompt-template' LIMIT 1),
 '["summarization", "prompt", "extraction", "nlp", "text-analysis"]',
 'Prompt Engineering Hub', '2.5.0', 'CC0',
 'https://github.com/dair-ai/Prompt-Engineering-Guide',
 'https://promptingguide.ai',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/notepad.png',
 0.91, 19800, 4700, 'seed', 'active', TRUE,
 '复制模板到对话中，粘贴长文本内容，选择摘要级别即可获得结构化摘要。',
 '场景一：将 50 页的技术报告压缩为 2 页的核心要点摘要。'),

-- 16. Prompt Template: 代码审查
('代码审查 Prompt', 'code-review-prompt',
 '专业的代码审查提示词模板，覆盖安全、性能与最佳实践',
 '代码审查 Prompt 提供了系统化的代码审查框架，从代码质量、安全性、性能、可维护性、测试覆盖等多个维度进行评估。',
 'prompt_template', '["openai", "anthropic", "google"]',
 (SELECT id FROM categories WHERE slug = 'prompt-template' LIMIT 1),
 '["code-review", "prompt", "security", "best-practices", "quality"]',
 'Code Quality Lab', '2.0.0', 'MIT',
 'https://github.com/dair-ai/Prompt-Engineering-Guide',
 'https://promptingguide.ai',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/git.png',
 0.87, 11600, 2900, 'seed', 'active', FALSE,
 '粘贴待审查的代码到模板中，指定编程语言和关注重点即可获得详细审查报告。',
 '场景一：提交代码前让 AI 检查潜在的安全漏洞和性能问题。'),

-- 17. Prompt Template: 文案创作
('爆款文案创作 Prompt', 'viral-copywriting-prompt',
 '高转化率文案创作提示词模板，覆盖广告、社交媒体与电商场景',
 '爆款文案创作 Prompt 提供了经过市场验证的文案创作框架，涵盖 AIDA 模型、PAS 公式、故事营销等多种文案技巧。',
 'prompt_template', '["openai", "anthropic", "google", "mistral"]',
 (SELECT id FROM categories WHERE slug = 'prompt-template' LIMIT 1),
 '["copywriting", "prompt", "marketing", "advertising", "conversion"]',
 'Copywriting Master', '3.2.0', 'CC0',
 'https://github.com/dair-ai/Prompt-Engineering-Guide',
 'https://promptingguide.ai',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/canva.png',
 0.87, 16400, 4100, 'seed', 'active', FALSE,
 '选择文案类型和目标平台，填写产品信息和目标受众，AI 将生成多版本文案供选择。',
 '场景一：输入产品卖点让 AI 生成 10 个吸引眼球的广告标题。'),

-- 18. RAG: Chroma
('Chroma - 嵌入式向量数据库', 'chroma-vector-database',
 '轻量级嵌入式向量数据库，专为 AI 应用设计，开箱即用',
 'Chroma 是一个开源的嵌入式向量数据库，专为 AI 应用设计。支持本地运行，无需额外基础设施，提供简单的 API 进行文档存储、向量搜索和元数据过滤。',
 'mcp_server', '["openai", "anthropic", "google"]',
 (SELECT id FROM categories WHERE slug = 'vector-database' LIMIT 1),
 '["chroma", "vector-database", "embedding", "search", "local"]',
 'Chroma', '0.5.0', 'Apache-2.0',
 'https://github.com/chroma-core/chroma',
 'https://www.trychroma.com',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/chroma.png',
 0.90, 16800, 3900, 'seed', 'active', TRUE,
 'pip install chromadb，创建集合，添加文档和嵌入，执行相似度搜索。',
 '场景一：为个人知识库构建本地向量搜索。场景二：为 RAG 应用提供向量存储后端。'),

-- 19. RAG: LlamaIndex
('LlamaIndex - RAG 数据框架', 'llamaindex-rag-framework',
 '强大的 RAG 数据框架，支持多种数据源接入和索引策略',
 'LlamaIndex 是一个专注于数据接入和索引的 RAG 框架。支持 100+ 数据源连接器，提供多种索引策略（向量、树、列表等），内置查询引擎和路由机制。',
 'agent_tool', '["openai", "anthropic", "google", "mistral"]',
 (SELECT id FROM categories WHERE slug = 'llamaindex' LIMIT 1),
 '["llamaindex", "rag", "data-connector", "indexing", "retrieval"]',
 'LlamaIndex', '0.10.0', 'MIT',
 'https://github.com/run-llama/llama_index',
 'https://docs.llamaindex.ai',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/llamaindex.png',
 0.92, 24600, 5800, 'seed', 'active', TRUE,
 'pip install llama-index，创建 VectorStoreIndex，构建查询引擎并提问。',
 '场景一：从 PDF 文档构建知识库问答系统。场景二：连接多个数据源实现跨库检索。'),

-- 20. AI Coding: Cursor
('Cursor - AI 代码编辑器', 'cursor-ai-editor',
 '基于 VS Code 的 AI 代码编辑器，深度集成 AI 编程助手',
 'Cursor 是一款基于 VS Code 构建的 AI 代码编辑器，深度集成了 AI 编程能力。支持 AI 代码补全、自然语言编辑、代码库理解和多文件编辑等高级功能。',
 'tool', '["openai", "anthropic", "google"]',
 (SELECT id FROM categories WHERE slug = 'copilot-tool' LIMIT 1),
 '["cursor", "ai-editor", "code-completion", "vscode", "ide"]',
 'Anysphere', '0.30.0', 'Proprietary',
 'https://github.com/getcursor/cursor',
 'https://cursor.sh',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/cursor.png',
 0.95, 42000, 12000, 'seed', 'active', TRUE,
 '从 cursor.sh 下载安装，连接 GitHub 仓库，选择 AI 模型即可开始使用。',
 '场景一：用自然语言描述需求让 AI 自动修改多个文件。场景二：让 AI 理解整个代码库并回答架构问题。'),

-- 21. AI Coding: GitHub Copilot
('GitHub Copilot', 'github-copilot',
 'GitHub 官方 AI 编程助手，支持代码补全、聊天和 Agent 模式',
 'GitHub Copilot 是 GitHub 推出的 AI 编程助手，集成在 VS Code、JetBrains 等主流 IDE 中。支持实时代码补全、代码解释、Bug 修复、测试生成等功能。',
 'tool', '["openai", "anthropic"]',
 (SELECT id FROM categories WHERE slug = 'copilot-tool' LIMIT 1),
 '["copilot", "code-completion", "github", "ai-assistant", "ide"]',
 'GitHub', '1.0.0', 'Proprietary',
 'https://github.com/features/copilot',
 'https://github.com/features/copilot',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/githubcopilot.png',
 0.96, 85000, 22000, 'seed', 'active', TRUE,
 '安装 GitHub Copilot VS Code 扩展，登录 GitHub 账号即可使用。',
 '场景一：写注释让 AI 自动生成函数实现。场景二：选中代码让 AI 解释或优化。'),

-- 22. AI Creation: Stable Diffusion
('Stable Diffusion WebUI', 'stable-diffusion-webui',
 '开源 AI 图像生成工具，支持文生图、图生图和图像编辑',
 'Stable Diffusion WebUI 是最流行的开源 AI 图像生成工具之一，基于 Stable Diffusion 模型。支持文生图、图生图、图像修复、ControlNet 控制等丰富功能。',
 'tool', '["general"]',
 (SELECT id FROM categories WHERE slug = 'image-generation' LIMIT 1),
 '["stable-diffusion", "image-generation", "text-to-image", "ai-art"]',
 'AUTOMATIC1111', '1.9.0', 'MIT',
 'https://github.com/AUTOMATIC1111/stable-diffusion-webui',
 'https://github.com/AUTOMATIC1111/stable-diffusion-webui',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/stablediffusion.png',
 0.94, 68000, 18000, 'seed', 'active', TRUE,
 '克隆仓库并安装依赖，运行 launch.py 启动 WebUI，下载模型后即可生成图像。',
 '场景一：输入文字描述生成高质量 AI 图像。场景二：上传草图让 AI 生成精细插画。'),

-- 23. AI Creation: ComfyUI
('ComfyUI - 节点式 AI 图像工作流', 'comfyui-node-workflow',
 '基于节点的 AI 图像生成工作流编辑器，灵活可定制',
 'ComfyUI 是一款基于节点流程图的 AI 图像生成工具，支持 Stable Diffusion、Flux 等多种模型。通过拖拽节点构建复杂的图像生成工作流，高度灵活可定制。',
 'tool', '["general"]',
 (SELECT id FROM categories WHERE slug = 'image-generation' LIMIT 1),
 '["comfyui", "node-based", "workflow", "stable-diffusion", "flux"]',
 'ComfyAnonymous', '0.2.0', 'GPL-3.0',
 'https://github.com/comfyanonymous/ComfyUI',
 'https://comfyanonymous.github.io/ComfyUI/',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/comfyui.png',
 0.91, 45000, 12000, 'seed', 'active', TRUE,
 '克隆仓库并安装依赖，运行 main.py 启动 WebUI，导入或创建工作流。',
 '场景一：构建多步图像生成工作流（生成 → 放大 → 修复）。场景二：使用 ControlNet 实现精确姿态控制。'),

-- 24. LangChain
('LangChain - LLM 应用开发框架', 'langchain-llm-framework',
 '最流行的 LLM 应用开发框架，提供链式调用、Agent 和工具集成',
 'LangChain 是一个强大的 LLM 应用开发框架，提供了链式调用（Chains）、Agent、工具集成、记忆管理、文档加载等核心模块。支持多种 LLM 提供商和向量数据库。',
 'agent_tool', '["openai", "anthropic", "google", "mistral"]',
 (SELECT id FROM categories WHERE slug = 'langchain' LIMIT 1),
 '["langchain", "llm", "chain", "agent", "tool-calling", "memory"]',
 'LangChain', '0.2.0', 'MIT',
 'https://github.com/langchain-ai/langchain',
 'https://python.langchain.com',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/langchain.png',
 0.93, 52000, 14000, 'seed', 'active', TRUE,
 'pip install langchain langchain-openai，配置 API Key，创建 Chain 或 Agent。',
 '场景一：构建带记忆的对话机器人。场景二：创建 RAG 问答系统。'),

-- 25. OpenAI Plugin
('ChatGPT Retrieval Plugin', 'chatgpt-retrieval-plugin',
 'OpenAI 官方的 ChatGPT 检索插件，支持私有数据接入',
 'ChatGPT Retrieval Plugin 是 OpenAI 推出的官方插件，允许 ChatGPT 访问私有数据源。支持多种向量数据库后端，实现文档上传、索引和语义检索。',
 'custom_gpt', '["openai"]',
 (SELECT id FROM categories WHERE slug = 'openai-plugin' LIMIT 1),
 '["openai", "plugin", "retrieval", "rag", "chatgpt"]',
 'OpenAI', '1.0.0', 'MIT',
 'https://github.com/openai/chatgpt-retrieval-plugin',
 'https://github.com/openai/chatgpt-retrieval-plugin',
 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openai.png',
 0.88, 32000, 8500, 'seed', 'active', FALSE,
 '克隆仓库，配置向量数据库后端，部署为 API 服务，在 ChatGPT 中安装插件。',
 '场景一：让 ChatGPT 搜索公司内部文档并回答问题。场景二：连接 Notion 数据源实现知识库问答。')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 完成
-- ============================================================
-- 更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_categories_updated
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tools_updated
    BEFORE UPDATE ON tools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reviews_updated
    BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
