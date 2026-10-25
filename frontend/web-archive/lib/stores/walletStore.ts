import { create } from "zustand";
import type { WalletBalance, WalletHolding } from "@/lib/types";

interface WalletState {
  availableCredits: number;
  reservedCredits: number;
  totalCredits: number;
  holdings: WalletHolding[];
  isLoading: boolean;
  hasLoaded: boolean;
  lastUpdated: number;

  // Authoritative server updates only - no optimistic computation.
  setWalletFromServer: (data: WalletBalance) => void;
  updateHoldingFromServer: (holding: WalletHolding) => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Presentation cache for server truth. Zero is deliberately used before the
 * first wallet response so the UI can show an em dash rather than inventing a
 * balance for a new session.
 */
export const useWalletStore = create<WalletState>((set) => ({
  availableCredits: 0,
  reservedCredits: 0,
  totalCredits: 0,
  holdings: [],
  isLoading: false,
  hasLoaded: false,
  lastUpdated: 0,

  setWalletFromServer: (data) =>
    set({
      availableCredits: data.available_credits,
      reservedCredits: data.reserved_credits,
      totalCredits: data.total_credits,
      holdings: data.holdings,
      lastUpdated: Date.now(),
      hasLoaded: true,
      isLoading: false,
    }),

  updateHoldingFromServer: (updated) =>
    set((state) => {
      const idx = state.holdings.findIndex((h) => h.asset_id === updated.asset_id);
      const holdings = [...state.holdings];
      if (idx >= 0) {
        holdings[idx] = updated;
      } else {
        holdings.push(updated);
      }
      return { holdings, lastUpdated: Date.now() };
    }),

  setLoading: (loading) => set({ isLoading: loading }),
}));
