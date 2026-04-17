// ==================== Category ====================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  toolCount: number;
  parentId?: string;
  children?: Category[];
}

// ==================== Tool ====================

export type ToolType = "prompt" | "workflow" | "agent" | "plugin" | "tool" | "mcp_server" | "custom_gpt" | "agent_tool" | "prompt_template";

export type ToolPlatform = "chatgpt" | "claude" | "midjourney" | "stable_diffusion" | "dalle" | "general";

export interface ToolRating {
  score: number;
  count: number;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  detail?: string;
  type: ToolType;
  platform: ToolPlatform;
  category: Category;
  author: string;
  version?: string;
  content: string;
  tags: string[];
  rating: ToolRating;
  usageCount: number;
  favoriteCount?: number;
  isFeatured?: boolean;
  installGuide?: string;
  usageExample?: string;
  githubUrl?: string;
  giteeUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== Search ====================

export interface SearchFilters {
  query?: string;
  categoryId?: string;
  type?: ToolType;
  platform?: ToolPlatform;
  sortBy?: "relevance" | "rating" | "newest" | "popular";
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  items: Tool[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== API Response ====================

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== Favorite ====================

export interface Favorite {
  id: string;
  toolId: string;
  tool: Tool;
  createdAt: string;
}

// ==================== Platform Info ====================

export interface PlatformInfo {
  id: ToolPlatform;
  name: string;
  icon: string;
}

export const PLATFORM_MAP: Record<ToolPlatform, PlatformInfo> = {
  chatgpt: { id: "chatgpt", name: "ChatGPT", icon: "MessageSquare" },
  claude: { id: "claude", name: "Claude", icon: "Sparkles" },
  midjourney: { id: "midjourney", name: "Midjourney", icon: "Image" },
  stable_diffusion: { id: "stable_diffusion", name: "Stable Diffusion", icon: "Palette" },
  dalle: { id: "dalle", name: "DALL-E", icon: "Wand2" },
  general: { id: "general", name: "通用", icon: "Bot" },
};

export const TOOL_TYPE_MAP: Record<string, string> = {
  prompt: "提示词",
  workflow: "工作流",
  agent: "智能体",
  plugin: "插件",
  tool: "工具",
  mcp_server: "MCP 服务",
  custom_gpt: "自定义 GPT",
  agent_tool: "智能体工具",
  prompt_template: "提示词模板",
};

// 工具类型对应的颜色
export const TOOL_TYPE_COLORS: Record<string, string> = {
  prompt: "bg-blue-100 text-blue-700 border-blue-200",
  workflow: "bg-violet-100 text-violet-700 border-violet-200",
  agent: "bg-emerald-100 text-emerald-700 border-emerald-200",
  plugin: "bg-amber-100 text-amber-700 border-amber-200",
  tool: "bg-cyan-100 text-cyan-700 border-cyan-200",
  mcp_server: "bg-rose-100 text-rose-700 border-rose-200",
  custom_gpt: "bg-green-100 text-green-700 border-green-200",
  agent_tool: "bg-indigo-100 text-indigo-700 border-indigo-200",
  prompt_template: "bg-pink-100 text-pink-700 border-pink-200",
};

// ==================== Auth ====================

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  role: string;
  tier: string;
  preferences?: Record<string, any>;
  created_at: string;
}

// ==================== Review ====================

export interface Review {
  id: string;
  user_id: string;
  tool_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  user?: { username: string; avatar_url?: string };
}
