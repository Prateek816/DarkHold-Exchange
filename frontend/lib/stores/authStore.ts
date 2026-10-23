import { create } from "zustand";
import { AuthUser } from "@/lib/types";
import { api } from "@/lib/api-client";
import { useWalletStore } from "./walletStore";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  setSession: (user: AuthUser, token?: string | null) => void;
  clearSession: () => void;
  initSession: () => Promise<AuthUser | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("dkh_auth_token") : null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,

  setSession: (user, token) => {
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("dkh_auth_token", token);
      }
      localStorage.setItem("dkh_auth_user", JSON.stringify(user));
    }
    if (token) {
      api.setAuthToken(token);
    }
    set({
      user,
      token: token || get().token,
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
    });
  },

  clearSession: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("dkh_auth_token");
      localStorage.removeItem("dkh_auth_user");
    }
    api.setAuthToken(null);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
    });
  },

  initSession: async () => {
    if (get().isInitialized && !get().isLoading) {
      return get().user;
    }

    set({ isLoading: true });

    try {
      const user = await api.getSession();
      if (user) {
        if (typeof window !== "undefined") {
          localStorage.setItem("dkh_auth_user", JSON.stringify(user));
        }
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });

        // Sync wallet from backend
        try {
          const freshWallet = await api.getWallet();
          useWalletStore.getState().setWalletFromServer(freshWallet);
        } catch {
          // ignore non-fatal wallet sync error
        }

        return user;
      } else {
        get().clearSession();
        return null;
      }
    } catch {
      get().clearSession();
      return null;
    }
  },
}));

