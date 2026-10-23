import { create } from "zustand";
import { AuthUser } from "@/lib/types";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (user: AuthUser, token: string) => void;
  clearSession: () => void;
  initSession: () => void;
}

const DEFAULT_USER: AuthUser = {
  id: "trader_01",
  email: "trader@darkhold.io",
  name: "trader_01",
};

export const useAuthStore = create<AuthState>((set) => ({
  user: DEFAULT_USER,
  token:
    typeof window !== "undefined"
      ? localStorage.getItem("dkh_auth_token") || "dkh_sess_trader_01_live"
      : "dkh_sess_trader_01_live",
  isAuthenticated: true,
  isLoading: false,

  setSession: (user, token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dkh_auth_token", token);
      localStorage.setItem("dkh_auth_user", JSON.stringify(user));
    }
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  clearSession: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("dkh_auth_token");
      localStorage.removeItem("dkh_auth_user");
    }
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  initSession: () => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("dkh_auth_token");
      const storedUser = localStorage.getItem("dkh_auth_user");
      if (storedToken && storedUser) {
        try {
          const user = JSON.parse(storedUser);
          set({ user, token: storedToken, isAuthenticated: true, isLoading: false });
          return;
        } catch {
          // ignore parsing error
        }
      }
    }
  },
}));
