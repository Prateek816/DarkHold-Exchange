import { create } from "zustand";
import { WalletBalance, WalletHolding } from "@/lib/types";

interface WalletState {
  availableCredits: number;
  reservedCredits: number;
  totalCredits: number;
  holdings: WalletHolding[];
  isLoading: boolean;
  lastUpdated: number;

  // Authoritative server updates only - no optimistic computation
  setWalletFromServer: (data: WalletBalance) => void;
  updateHoldingFromServer: (holding: WalletHolding) => void;
  clearWallet: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  availableCredits: 500000, // Seed: $5,000.00
  reservedCredits: 0,
  totalCredits: 500000,
  holdings: [],
  isLoading: false,
  lastUpdated: Date.now(),

  setWalletFromServer: (data) =>
    set({
      availableCredits: data.available_credits,
      reservedCredits: data.reserved_credits,
      totalCredits: data.total_credits,
      holdings: data.holdings,
      lastUpdated: Date.now(),
      isLoading: false,
    }),

  updateHoldingFromServer: (updated) =>
    set((state) => {
      const idx = state.holdings.findIndex((h) => h.asset_id === updated.asset_id);
      let newHoldings = [...state.holdings];
      if (idx >= 0) {
        newHoldings[idx] = updated;
      } else {
        newHoldings.push(updated);
      }
      return { holdings: newHoldings, lastUpdated: Date.now() };
    }),

  clearWallet: () =>
    set({
      availableCredits: 0,
      reservedCredits: 0,
      totalCredits: 0,
      holdings: [],
      isLoading: false,
      lastUpdated: Date.now(),
    }),
}));
