import axios from "axios";
import type {
  Category,
  Tool,
  ToolType,
  ToolPlatform,
  ToolRating,
  SearchFilters,
  SearchResult,
  TokenResponse,
  UserInfo,
  Review,
} from "./types";

// ==================== Axios Instance ====================

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api/v1",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — 含 429 自动重试
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      const { status, data, config } = error.response;
      const msg = data?.detail || data?.message || `请求失败 (${status})`;

      // 429 限流：自动等待后重试（最多 2 次，间隔 2s）
      if (status === 429) {
        const retryCount = config?._retryCount ?? 0;
        if (retryCount < 2) {
          console.warn(`[API] ${config?.url} → 429 限流，第 ${retryCount + 1} 次重试...`);
          const newConfig = { ...config, _retryCount: retryCount + 1 };
          await new Promise((r) => setTimeout(r, 2000));
          return api(newConfig);
        }
        console.warn(`[API] ${config?.url} → 429 限流，重试耗尽`);
      }

      console.warn(`[API] ${config?.url} → ${status}: ${msg}`);
    } else if (error.code === "ECONNABORTED") {
      console.warn("[API] 请求超时");
    } else {
      console.warn("[API] 网络错误");
    }
    return Promise.reject(error);
  }
);

// ==================== Helper: map backend ToolList to frontend Tool ====================

function mapTool(raw: any): Tool {
  return {
    id: raw.id,
    name: raw.name || "",
    description: raw.description || "",
    detail: raw.detail || null,
    type: (raw.tool_type || raw.type || "tool") as ToolType,
    platform: (raw.platforms?.[0] || raw.platform || "general") as ToolPlatform,
    category: raw.category
      ? { id: raw.category.id || "", name: raw.category.name || "", slug: raw.category.slug || "", toolCount: 0, icon: raw.category.icon }
      : { id: "", name: "", slug: "", toolCount: 0 },
    author: raw.author || "",
    version: raw.version || null,
    content: raw.content || raw.detail || "",
    tags: raw.tags || [],
    rating: {
      score: Number(raw.quality_score) || Number(raw.avg_rating) || 0,
      count: raw.review_count || raw.rating_count || 0,
    } as ToolRating,
    usageCount: raw.usage_count || 0,
    favoriteCount: raw.favorite_count || 0,
    isFeatured: raw.is_featured || false,
    installGuide: raw.install_guide || null,
    usageExample: raw.usage_examples || raw.usage_example || null,
    githubUrl: raw.github_url || null,
    giteeUrl: raw.gitee_url || null,
    createdAt: raw.created_at || "",
    updatedAt: raw.updated_at || raw.last_synced_at || "",
  };
}

function mapCategory(raw: any): Category {
  return {
    id: raw.id,
    name: raw.name || "",
    slug: raw.slug || "",
    description: raw.description || "",
    icon: raw.icon || null,
    toolCount: raw.tool_count || raw.toolCount || 0,
    parentId: raw.parent_id || null,
    children: raw.children ? raw.children.map(mapCategory) : undefined,
  };
}

// ==================== Categories ====================

export async function getCategories(): Promise<Category[]> {
  const res = await api.get("/categories");
  const body = res.data;
  // 后端返回 { code: 200, data: { items: [CategoryOut...] } }
  const data = body?.data;
  if (data && Array.isArray(data.items)) return data.items.map(mapCategory);
  if (Array.isArray(data)) return data.map(mapCategory);
  if (Array.isArray(body)) return body.map(mapCategory);
  return [];
}

export async function getCategoryById(id: string): Promise<Category> {
  const res = await api.get(`/categories/${id}`);
  return mapCategory(res.data?.data);
}

// ==================== Tools ====================

export async function getTools(params?: {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  sortBy?: string;
  is_featured?: boolean;
}): Promise<SearchResult> {
  // 后端参数名映射: pageSize→size, categoryId→category_id, sortBy→sort
  const queryParams: Record<string, any> = {};
  if (params?.page) queryParams.page = params.page;
  if (params?.pageSize) queryParams.size = params.pageSize;
  if (params?.categoryId) queryParams.category_id = params.categoryId;
  if (params?.sortBy) {
    const sortMap: Record<string, string> = {
      quality_score: "quality_score",
      rating: "quality_score",
      newest: "created_at",
      popular: "usage_count",
      created_at: "created_at",
    };
    queryParams.sort = sortMap[params.sortBy] || params.sortBy;
  }
  // 注意: 后端 GET /tools 不支持 is_featured 参数，忽略它

  const res = await api.get("/tools", { params: queryParams });
  const body = res.data;

  // 后端 ResponseWithPagination: { code, data: [ToolList...], pagination: { page, size, total, pages } }
  if (body?.pagination) {
    const pag = body.pagination;
    const items = Array.isArray(body.data) ? body.data : [];
    return {
      items: items.map(mapTool),
      total: pag.total || 0,
      page: pag.page || 1,
      pageSize: pag.size || 10,
      totalPages: pag.pages || 1,
    };
  }

  // 兼容: 后端也可能返回 { data: { items: [...] } } 或 { data: [...] }
  const data = body?.data;
  const items = Array.isArray(data) ? data : data?.items || [];
  return {
    items: items.map(mapTool),
    total: data?.total || body?.total || 0,
    page: data?.page || body?.page || 1,
    pageSize: data?.pageSize || data?.size || body?.size || 10,
    totalPages: data?.totalPages || data?.pages || body?.pages || 1,
  };
}

export async function getFeaturedTools(page = 1, pageSize = 6): Promise<SearchResult> {
  try {
    // 后端不支持 is_featured 参数，改用 sort=usage_count 获取热门工具
    const res = await api.get("/tools", { params: { sort: "usage_count", page, size: pageSize } });
    const body = res.data;

    if (body?.pagination) {
      const pag = body.pagination;
      const items = Array.isArray(body.data) ? body.data : [];
      return {
        items: items.map(mapTool),
        total: pag.total || 0,
        page: pag.page || page,
        pageSize: pag.size || pageSize,
        totalPages: pag.pages || 1,
      };
    }

    const data = body?.data;
    const items = Array.isArray(data) ? data : data?.items || [];
    return {
      items: items.map(mapTool),
      total: data?.total || 0,
      page: data?.page || page,
      pageSize: data?.pageSize || data?.size || pageSize,
      totalPages: data?.totalPages || data?.pages || 1,
    };
  } catch {
    // /tools 端点可能不可用，返回空
    return { items: [], total: 0, page: 1, pageSize, totalPages: 0 };
  }
}

export async function getToolsByCategory(
  categoryId: string,
  page = 1,
  pageSize = 12
): Promise<SearchResult> {
  // 后端参数: category_id, page, size
  const res = await api.get("/tools", { params: { category_id: categoryId, page, size: pageSize } });
  const body = res.data;

  if (body?.pagination) {
    const pag = body.pagination;
    const items = Array.isArray(body.data) ? body.data : [];
    return {
      items: items.map(mapTool),
      total: pag.total || 0,
      page: pag.page || page,
      pageSize: pag.size || pageSize,
      totalPages: pag.pages || 1,
    };
  }

  const data = body?.data;
  const items = Array.isArray(data) ? data : data?.items || [];
  return {
    items: items.map(mapTool),
    total: data?.total || 0,
    page: data?.page || page,
    pageSize: data?.pageSize || data?.size || pageSize,
    totalPages: data?.totalPages || data?.pages || 1,
  };
}

export async function getToolDetail(id: string): Promise<Tool> {
  const res = await api.get(`/tools/${id}`);
  return mapTool(res.data?.data);
}

// ==================== Search ====================

export async function searchTools(filters: SearchFilters): Promise<SearchResult> {
  const params: Record<string, any> = {};

  if (filters.query) params.q = filters.query;
  if (filters.categoryId) params.category_id = filters.categoryId;
  if (filters.type) params.tool_type = filters.type;
  if (filters.platform) params.platform = filters.platform;
  if (filters.sortBy) {
    const sortMap: Record<string, string> = {
      relevance: "relevance",
      rating: "quality_score",
      newest: "created_at",
      popular: "usage_count",
    };
    params.sort = sortMap[filters.sortBy] || filters.sortBy;
  }
  if (filters.page) params.page = filters.page;
  // 后端用 size 而不是 pageSize
  if (filters.pageSize) params.size = filters.pageSize;

  const res = await api.get("/search", { params });
  const body = res.data;

  // 后端 ResponseWithPagination: { code, data: [ToolList...], pagination: { page, size, total, pages } }
  if (body?.pagination) {
    const pag = body.pagination;
    const items = Array.isArray(body.data) ? body.data : [];
    return {
      items: items.map(mapTool),
      total: pag.total || 0,
      page: pag.page || 1,
      pageSize: pag.size || 10,
      totalPages: pag.pages || 1,
    };
  }
  // 兼容：后端也可能返回 { data: { items: [...] } }
  const data = body?.data;
  const items = Array.isArray(data) ? data : data?.items || [];
  return {
    items: items.map(mapTool),
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || data?.size || 10,
    totalPages: data?.totalPages || data?.pages || 1,
  };
}

// ==================== Favorites (localStorage) ====================

const FAVORITES_KEY = "ai-tools-hub-favorites";

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addFavorite(toolId: string): string[] {
  const favorites = getFavorites();
  if (!favorites.includes(toolId)) {
    favorites.push(toolId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
  return favorites;
}

export function removeFavorite(toolId: string): string[] {
  let favorites = getFavorites();
  favorites = favorites.filter((id) => id !== toolId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return favorites;
}

export function isFavorite(toolId: string): boolean {
  return getFavorites().includes(toolId);
}

// ==================== Auth API ====================

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post<TokenResponse>("/auth/register", data),

  login: (data: { username: string; password: string }) =>
    api.post<TokenResponse>("/auth/login", data),

  getMe: () => api.get<UserInfo>("/auth/me"),

  updateProfile: (data: { avatar_url?: string; preferences?: object }) =>
    api.put("/auth/profile", data),

  changePassword: (data: { old_password: string; new_password: string }) =>
    api.put("/auth/password", data),
};

// ==================== Favorites API ====================

export const favoriteApi = {
  getList: (page = 1, pageSize = 12) =>
    api.get("/favorites", { params: { page, size: pageSize } }),

  add: (toolId: string) => api.post(`/favorites/${toolId}`),

  remove: (toolId: string) => api.delete(`/favorites/${toolId}`),

  check: (toolId: string) => api.get(`/favorites/check/${toolId}`),
};

// ==================== Reviews API ====================

export const reviewApi = {
  getList: (toolId: string, page = 1, pageSize = 10) =>
    api.get(`/tools/${toolId}/reviews`, { params: { page, pageSize } }),

  create: (toolId: string, data: { rating: number; comment?: string }) =>
    api.post(`/tools/${toolId}/reviews`, data),

  update: (reviewId: string, data: { rating: number; comment?: string }) =>
    api.put(`/reviews/${reviewId}`, data),

  delete: (reviewId: string) => api.delete(`/reviews/${reviewId}`),
};

// ==================== Recommend API ====================

export const recommendApi = {
  recommend: (query: string, page = 1, size = 10) =>
    api.post("/recommend", { query, page, size }),

  related: async (toolId: string, limit = 6): Promise<Tool[]> => {
    const res = await api.get(`/recommend/related/${toolId}`, { params: { limit } });
    const data = res.data?.data;
    if (Array.isArray(data)) return data.map(mapTool);
    if (data && Array.isArray(data.items)) return data.items.map(mapTool);
    return [];
  },
};

// ==================== Search Suggest API ====================

export async function searchSuggest(q: string, size: number = 10) {
  return api.get(`/search/suggest?q=${encodeURIComponent(q)}&size=${size}`);
}

// ==================== Search History API ====================

export async function getSearchHistory(limit: number = 10) {
  return api.get(`/search/history?limit=${limit}`);
}

// ==================== Ranking API ====================

export async function getRanking(params?: {
  sort_by?: string;
  category_id?: string;
  tool_type?: string;
  page?: number;
  size?: number;
}): Promise<SearchResult> {
  const res = await api.get("/ranking/tools", { params });
  const body = res.data;
  // 后端返回 { success: true, data: { items, total, page, size, sort_by } }
  // 注意：没有 pages 字段，需要手动计算
  const data = body?.data || body;
  const rawItems = data?.items || [];
  const total = data?.total || 0;
  const size = data?.size || 20;
  const page = data?.page || 1;
  const pages = size > 0 ? Math.ceil(total / size) : 0;

  return {
    items: rawItems.map(mapTool),
    total,
    page,
    pageSize: size,
    totalPages: pages,
  };
}

// ==================== Crawl API ====================

export const crawlApi = {
  quickCrawl: (data: { query: string; source: string; max_items?: number }) =>
    api.post("/crawl/quick", data),

  fullCrawl: (source: string = "github", max_items: number = 30) =>
    api.post("/crawl/full", null, { params: { source, max_items } }),

  getCrawlTasks: (params?: { status?: string; page?: number; size?: number }) =>
    api.get("/crawl/tasks", { params }),

  createCrawlTask: (data: { name: string; source_type: string; source_config: Record<string, any>; schedule?: string }) =>
    api.post("/crawl/tasks", data),

  runCrawlTask: (taskId: string) =>
    api.post(`/crawl/tasks/${taskId}/run`),

  getCrawlTask: (taskId: string) =>
    api.get(`/crawl/tasks/${taskId}`),
};
