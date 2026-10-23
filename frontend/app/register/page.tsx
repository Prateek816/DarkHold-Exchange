"use client";

import React, { Suspense } from "react";
import LoginPage from "../login/page";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
        </div>
      }
    >
      <div className="flex flex-1 flex-col">
        {/* Render register flow */}
        <LoginPage />
      </div>
    </Suspense>
  );
}
