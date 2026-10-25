"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useUiStore } from "@/lib/stores/uiStore";
import { Preloader } from "@/components/landing/Preloader";
import { LandingHeader } from "@/components/landing/Header";
import { CustomCursor } from "@/components/landing/CustomCursor";
import { LenisScroll } from "@/components/landing/LenisScroll";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { MediaSection } from "@/components/landing/MediaSection";
import { Benefits } from "@/components/landing/Benefits";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

const FEATURED_ASSET = "DARKHOLD-PASS-2026";

export default function LandingPage() {
  const [showCursor, setShowCursor] = useState(false);
  const { addToast } = useUiStore();

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["landing-assets"],
    queryFn: () => api.getAssets(),
    refetchInterval: 30_000,
  });

  const featured = assets.find((a) => a.id === FEATURED_ASSET) ?? assets[0];

  // Custom cursor only on fine pointers, landing only
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    setShowCursor(mq.matches);
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-glow", "landing");
    return () => document.body.removeAttribute("data-glow");
  }, []);

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-ink">
      {/* Preloader — Ward line draws, once per session */}
      <Preloader />

      {/* Header — logo draw-in, transparent→glass */}
      <LandingHeader />

      {showCursor && <CustomCursor />}

      <main className="flex-1 relative z-10">
        <LenisScroll>
          {/* Element 1-3: Hero with H1, subtitle, primary CTA */}
          <Hero
            faceValue={featured?.face_value ?? 25000}
            ceilingPrice={featured?.ceiling_price ?? 27500}
            ceilingPct={featured?.ceiling_pct ?? 110}
          />

          {/* Element 5: Social proof — live count-up numbers */}
          <SocialProof />

          {/* Element 6: Media — tilted glass frame + pinned scroll story */}
          <MediaSection />

          {/* Element 7: Benefits — asymmetric bento with 6 SVG sigils */}
          <Benefits />

          {/* Element 8: Testimonials — staggered masonry */}
          <Testimonials />

          {/* Element 9: FAQ — two-column accordion */}
          <FAQ />

          {/* Element 10: Final CTA — full-bleed with ticking Dutch auction */}
          <FinalCTA />

          {/* Element 11: Footer — multi-column with legal links */}
          <Footer />
        </LenisScroll>
      </main>

      <p className="border-t border-white/[0.04] pt-4 pb-8 font-mono text-[8.5px] leading-relaxed tracking-[0.04em] text-text-dim text-center">
        Simulated venue. Orders are matched and receipted by the in-browser mock ledger. No real
        money, venue, ticket or counterparty is involved.
      </p>
    </div>
  );
}
