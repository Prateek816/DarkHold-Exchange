"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastRegion } from "./ToastRegion";
import { useUiStore } from "@/lib/stores/uiStore";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5000,
          },
        },
      })
  );

  const { toasts, dismissToast } = useUiStore();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastRegion toasts={toasts} onDismiss={dismissToast} />
    </QueryClientProvider>
  );
}
