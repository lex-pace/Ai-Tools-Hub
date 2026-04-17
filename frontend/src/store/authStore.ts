import { create } from "zustand";
import { authApi, api } from "@/lib/api";
import type { UserInfo } from "@/lib/types";

const TOKEN_KEY = "ai-skills-hub-token";
const USER_KEY = "ai-skills-hub-user";

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: { avatar_url?: string; preferences?: object }) => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  loading: false,

  login: async (username: string, password: string) => {
    set({ loading: true });
    try {
      const res = await authApi.login({ username, password });
      // 后端返回 { code, data: { access_token, token_type, user } }
      const tokenData = (res.data as any)?.data || res.data;
      const { access_token, token_type, user } = tokenData;

      // 存储 token 和用户信息到 localStorage
      localStorage.setItem(TOKEN_KEY, access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      // 设置 axios 默认 Authorization header
      api.defaults.headers.common["Authorization"] = `${token_type} ${access_token}`;

      set({
        token: access_token,
        user,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  register: async (username: string, email: string, password: string) => {
    set({ loading: true });
    try {
      const res = await authApi.register({ username, email, password });
      // 后端返回 { code, data: { access_token, token_type, user } }
      const tokenData = (res.data as any)?.data || res.data;
      const { access_token, token_type, user } = tokenData;

      // 注册成功后自动登录
      localStorage.setItem(TOKEN_KEY, access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      api.defaults.headers.common["Authorization"] = `${token_type} ${access_token}`;

      set({
        token: access_token,
        user,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete api.defaults.headers.common["Authorization"];
    set({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  },

  updateProfile: async (updates: { avatar_url?: string; preferences?: object }) => {
    try {
      const res = await authApi.updateProfile(updates);
      const updatedUser = (res.data as any)?.data || res.data;
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      set({ user: updatedUser });
    } catch (error) {
      throw error;
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ token: null, user: null, isAuthenticated: false });
      return;
    }

    // 设置 header
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    set({ token });

    try {
      const res = await authApi.getMe();
      const user = (res.data as any)?.data || res.data;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } catch {
      // token 无效，清除
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      delete api.defaults.headers.common["Authorization"];
      set({ token: null, user: null, isAuthenticated: false });
    }
  },
}));
