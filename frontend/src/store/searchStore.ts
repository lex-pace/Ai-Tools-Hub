import { create } from "zustand";
import type { Skill, SearchFilters } from "@/lib/types";

interface SearchState {
  // 搜索状态
  query: string;
  results: Skill[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;

  // 筛选状态
  filters: SearchFilters;

  // Actions
  setQuery: (query: string) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  setPage: (page: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setResults: (results: {
    items: Skill[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }) => void;
  resetSearch: () => void;
}

const initialState = {
  query: "",
  results: [],
  total: 0,
  page: 1,
  pageSize: 12,
  totalPages: 0,
  loading: false,
  error: null,
  filters: {
    sortBy: "relevance" as const,
    page: 1,
    pageSize: 12,
  },
};

export const useSearchStore = create<SearchState>((set) => ({
  ...initialState,

  setQuery: (query) => set({ query, page: 1 }),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      page: 1,
    })),

  setPage: (page) => set({ page }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error, loading: false }),

  setResults: (results) =>
    set({
      results: results.items,
      total: results.total,
      page: results.page,
      pageSize: results.pageSize,
      totalPages: results.totalPages,
      loading: false,
      error: null,
    }),

  resetSearch: () => set(initialState),
}));
