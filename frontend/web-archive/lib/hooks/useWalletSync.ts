"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useWalletStore } from "@/lib/stores/walletStore";

/**
 * useWalletSync — Loads the authoritative wallet snapshot into the store.
 * Balances are only ever written from a server response. Nothing is computed
 * locally and no optimistic balance change is applied.
 */
export function useWalletSync() {
  const setWalletFromServer = useWalletStore((state) => state.setWalletFromServer);
  const setLoading = useWalletStore((state) => state.setLoading);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["wallet"],
    queryFn: () => api.getWallet(),
    refetchInterval: 30_000,
    staleTime: 5_000,
  });

  useEffect(() => {
    if (query.data) {
      setWalletFromServer(query.data);
    }
  }, [query.data, setWalletFromServer]);

  useEffect(() => {
    setLoading(query.isLoading);
  }, [query.isLoading, setLoading]);

  return {
    ...query,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["wallet"] }),
  };
}
