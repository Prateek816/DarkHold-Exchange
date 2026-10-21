import { create } from "zustand";
import { ConnectionState } from "@/lib/types";
import { ToastMessage } from "@/components/shell/ToastRegion";

interface UiState {
  connectionState: ConnectionState;
  setConnectionState: (state: ConnectionState) => void;

  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;

  isEngineUnavailable: boolean;
  setEngineUnavailable: (val: boolean) => void;

  // Selected asset ID for transitions
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  connectionState: "LIVE",
  setConnectionState: (state) => set({ connectionState: state }),

  toasts: [],
  addToast: (toast) => {
    const id = "toast_" + Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts.slice(-4), { ...toast, id }],
    }));

    // Auto dismiss after 6s unless it's rate-limited
    if (!toast.countdownSeconds) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, 6000);
    }
  },

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  isEngineUnavailable: false,
  setEngineUnavailable: (val) => set({ isEngineUnavailable: val }),

  selectedAssetId: "DARKHOLD-PASS-2026",
  setSelectedAssetId: (id) => set({ selectedAssetId: id }),
}));
