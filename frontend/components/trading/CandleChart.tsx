"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  IPriceLine,
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
import { ShieldAlert, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
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
  const ceilingLineRef = useRef<IPriceLine | null>(null);
  const hasFittedRef = useRef<boolean>(false);
  const candleDataCountRef = useRef<number>(0);

  // Derive the active last trade price
  const latestCandleClose = candles.length > 0 ? candles[candles.length - 1].close : undefined;
  const effectiveLastPrice = lastTradePrice ?? latestCandleClose;

  // Reset viewport fit flag when switching interval
  useEffect(() => {
    hasFittedRef.current = false;
  }, [interval]);

  // Initialize and render Lightweight Charts instance
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
        borderColor: "rgba(255, 255, 255, 0.08)",
        timeVisible: true,
        secondsVisible: interval === "5s",
        rightOffset: 8,
        barSpacing: interval === "5s" ? 10 : 9,
        minBarSpacing: 3,
        fixLeftEdge: false,
        fixRightEdge: false,
        shiftVisibleRangeOnNewBar: true,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          const hh = date.getHours().toString().padStart(2, "0");
          const mm = date.getMinutes().toString().padStart(2, "0");
          if (interval === "5s") {
            const ss = date.getSeconds().toString().padStart(2, "0");
            return `${hh}:${mm}:${ss}`;
          }
          return `${hh}:${mm}`;
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        autoScale: true,
        scaleMargins: {
          top: 0.12, // 12% margin above candles for the ceiling cap line
          bottom: 0.22, // 22% margin below candles for volume histogram
        },
      },
      crosshair: {
        vertLine: { color: "rgba(25, 203, 176, 0.4)", width: 1, style: LineStyle.Dashed },
        horzLine: { color: "rgba(25, 203, 176, 0.4)", width: 1, style: LineStyle.Dashed },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      localization: {
        priceFormatter: (val: number) => formatCurrency(val),
        timeFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return interval === "5s"
            ? date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
            : date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
        },
      },
    });

    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22C55E",
      downColor: "#F0506E",
      borderVisible: true,
      borderUpColor: "#22C55E",
      borderDownColor: "#F0506E",
      wickUpColor: "#22C55E",
      wickDownColor: "#F0506E",
      priceLineVisible: true,
      priceLineWidth: 1,
      priceLineColor: "#19CBB0",
      priceLineStyle: LineStyle.Dotted,
      lastValueVisible: true,
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
    if (ceilingPrice > 0) {
      ceilingLineRef.current = candleSeries.createPriceLine({
        price: ceilingPrice,
        color: "#F5B544",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "WARD CAP",
      });
    }

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
  }, [interval]);

  // Update ceiling price line dynamically if ceilingPrice changes
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    if (ceilingLineRef.current) {
      try {
        candleSeriesRef.current.removePriceLine(ceilingLineRef.current);
      } catch {}
      ceilingLineRef.current = null;
    }
    if (ceilingPrice > 0) {
      ceilingLineRef.current = candleSeriesRef.current.createPriceLine({
        price: ceilingPrice,
        color: "#F5B544",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "WARD CAP",
      });
    }
  }, [ceilingPrice]);

  // Ingest and render candle series data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;

    const getTimeInSeconds = (c: Candle): number => {
      const raw = c.open_time ?? c.openTime ?? 0;
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

    candleDataCountRef.current = candleData.length;

    try {
      candleSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);

      // Initial viewport: Focus on the most recent 65-80 candles with legible spacing
      if (!hasFittedRef.current && candleData.length > 0) {
        hasFittedRef.current = true;
        if (candleData.length > 65) {
          chartRef.current?.timeScale().setVisibleLogicalRange({
            from: candleData.length - 65,
            to: candleData.length + 5,
          });
        } else {
          chartRef.current?.timeScale().fitContent();
        }
      }
    } catch (err) {
      console.error("Failed to set chart candle data:", err);
    }
  }, [candles]);

  // Zoom and viewport action handlers
  const handleZoomIn = useCallback(() => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const current = (timeScale.options() as any).barSpacing || 10;
    timeScale.applyOptions({ barSpacing: Math.min(36, current * 1.3) });
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const current = (timeScale.options() as any).barSpacing || 10;
    timeScale.applyOptions({ barSpacing: Math.max(3, current / 1.3) });
  }, []);

  const handleResetView = useCallback(() => {
    if (!chartRef.current) return;
    const total = candleDataCountRef.current;
    if (total > 65) {
      chartRef.current.timeScale().setVisibleLogicalRange({
        from: total - 65,
        to: total + 5,
      });
    } else {
      chartRef.current.timeScale().fitContent();
    }
  }, []);

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

          {/* Zoom and pan controls */}
          <div className="flex items-center gap-1 rounded-full border border-glass-border bg-white/[0.025] px-1 py-0.5">
            <button
              onClick={handleZoomIn}
              title="Zoom In (+)"
              className="rounded-full p-1 text-text-dim hover:bg-white/[0.08] hover:text-text transition-colors"
            >
              <ZoomIn className="h-3 w-3" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out (-)"
              className="rounded-full p-1 text-text-dim hover:bg-white/[0.08] hover:text-text transition-colors"
            >
              <ZoomOut className="h-3 w-3" />
            </button>
            <button
              onClick={handleResetView}
              title="Reset View"
              className="rounded-full p-1 text-text-dim hover:bg-white/[0.08] hover:text-text transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          <div className="hidden items-center gap-2 font-mono text-[9.5px] text-text-dim sm:flex">
            <span className="h-2.5 w-2.5 rounded-[3px] border border-sim-border sim-hatch-pattern" />
            <span>Simulated history</span>
            <span className="text-glass-border">|</span>
            <span className="font-medium text-brand-400">Live from here →</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {effectiveLastPrice !== undefined && (
            <span className="hidden rounded-full border border-glass-border bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] text-text-muted md:inline-flex">
              Last{" "}
              <span className="pl-1 font-semibold tabular-nums text-brand-300">
                {formatCurrency(effectiveLastPrice)}
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
