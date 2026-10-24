"use client";

import React, { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  ColorType,
  Time,
  LineStyle,
} from "lightweight-charts";
import { Candle } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface CandleChartProps {
  candles: Candle[];
  ceilingPrice: number;
  lastTradePrice?: number;
  interval: "5s" | "1m";
  onIntervalChange: (interval: "5s" | "1m") => void;
  className?: string;
}

export function CandleChart({
  candles,
  ceilingPrice,
  lastTradePrice,
  interval,
  onIntervalChange,
  className,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Initialize and render Lightweight Charts
  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 420,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#98A4B4",
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.06)",
        timeVisible: true,
        secondsVisible: interval === "5s",
        rightOffset: 4,
        barSpacing: 8,
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.06)",
        autoScale: true,
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      crosshair: {
        vertLine: { color: "rgba(25, 203, 176, 0.4)", width: 1, style: LineStyle.Dashed },
        horzLine: { color: "rgba(25, 203, 176, 0.4)", width: 1, style: LineStyle.Dashed },
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22C55E",
      downColor: "#F0506E",
      borderVisible: false,
      wickUpColor: "#22C55E",
      wickDownColor: "#F0506E",
      priceFormat: {
        type: "custom",
        formatter: (val: number) => formatCurrency(val),
      },
    });
    candleSeriesRef.current = candleSeries;

    // Volume histogram overlay
    const volumeSeries = chart.addHistogramSeries({
      color: "rgba(25, 203, 176, 0.35)",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // The Ward ceiling line
    candleSeries.createPriceLine({
      price: ceilingPrice,
      color: "#F5B544",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "WARD CAP",
    });

    // Responsive resize
    const resize = () => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight || 420,
      });
    };

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(containerRef.current);
    window.addEventListener("resize", resize);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [ceilingPrice, interval]);

  // Update candle data immediately (no smoothing)
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;

    const getTimeInSeconds = (c: Candle): number => {
      const raw = c.open_time ?? c.openTime ?? 0;
      // If raw is in milliseconds (> 10 digits / > 1e11), convert to seconds
      return raw > 1e11 ? Math.floor(raw / 1000) : Math.floor(raw);
    };

    const validCandles = candles.filter((c) => {
      const t = getTimeInSeconds(c);
      return !isNaN(t) && t > 0;
    });

    if (validCandles.length === 0) return;

    const sorted = [...validCandles].sort((a, b) => getTimeInSeconds(a) - getTimeInSeconds(b));

    // Deduplicate by time for lightweight-charts
    const uniqueByTime: Candle[] = [];
    for (const c of sorted) {
      const t = getTimeInSeconds(c);
      if (uniqueByTime.length === 0 || getTimeInSeconds(uniqueByTime[uniqueByTime.length - 1]) !== t) {
        uniqueByTime.push(c);
      } else {
        uniqueByTime[uniqueByTime.length - 1] = c;
      }
    }

    const candleData: CandlestickData[] = uniqueByTime.map((c) => ({
      time: getTimeInSeconds(c) as Time,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
    }));

    const volumeData: HistogramData[] = uniqueByTime.map((c) => ({
      time: getTimeInSeconds(c) as Time,
      value: Number(c.volume),
      color: Number(c.close) >= Number(c.open) ? "rgba(34, 197, 94, 0.32)" : "rgba(240, 80, 110, 0.32)",
    }));

    try {
      candleSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);
      chartRef.current?.timeScale().fitContent();
    } catch (err) {
      console.error("Failed to set chart candle data:", err);
    }
  }, [candles]);

  return (
    <GlassCard glowEdge="teal" className={cn("flex flex-col overflow-hidden", className)}>
      {/* Chart control bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-glass-border bg-white/[0.015] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-text">
              Price action
            </span>
            <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-text-dim">
              <span className="h-1 w-1 animate-pulse rounded-full bg-brand-400 shadow-[0_0_5px_#19CBB0]" />
              streaming
            </span>
          </div>

          <SegmentedTabs
            tabs={[
              { id: "5s", label: "5s" },
              { id: "1m", label: "1m" },
            ]}
            activeId={interval}
            onChange={(id) => onIntervalChange(id as "5s" | "1m")}
            size="sm"
            variant="brand"
            layoutId="candle-interval-pill"
          />

          <div className="hidden items-center gap-2 font-mono text-[9.5px] text-text-dim sm:flex">
            <span className="h-2.5 w-2.5 rounded-[3px] border border-sim-border sim-hatch-pattern" />
            <span>Simulated history</span>
            <span className="text-glass-border">|</span>
            <span className="font-medium text-brand-400">Live from here →</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastTradePrice !== undefined && (
            <span className="hidden rounded-full border border-glass-border bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] text-text-muted md:inline-flex">
              Last{" "}
              <span className="pl-1 font-semibold tabular-nums text-text">
                {formatCurrency(lastTradePrice)}
              </span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/35 bg-warning/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-warning shadow-glow-ward">
            <ShieldAlert className="h-3 w-3" />
            Cap {formatCurrency(ceilingPrice)}
          </span>
        </div>
      </div>

      {/* Chart canvas */}
      <div ref={containerRef} className="relative h-[340px] w-full sm:h-[420px]" />
    </GlassCard>
  );
}
