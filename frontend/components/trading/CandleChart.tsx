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
import { ShieldAlert, Activity } from "lucide-react";
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
      height: 420,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8B94A3",
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.06)",
        timeVisible: true,
        secondsVisible: interval === "5s",
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.06)",
        autoScale: true,
      },
      crosshair: {
        vertLine: { color: "rgba(25, 203, 176, 0.4)", width: 1, style: LineStyle.Dashed },
        horzLine: { color: "rgba(25, 203, 176, 0.4)", width: 1, style: LineStyle.Dashed },
      },
    });

    chartRef.current = chart;

    // Candlestick Series (up = #22C55E, down = #F0506E)
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

    // Volume Histogram (overlay at bottom at 35% alpha)
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

    // The Ward Ceiling Line: amber dashed with glow
    candleSeries.createPriceLine({
      price: ceilingPrice,
      color: "#F5B544",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "WARD CEILING",
    });

    // Responsive resize listener
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [ceilingPrice, interval]);

  // Update candle data immediately (no smoothing)
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;

    const sorted = [...candles].sort((a, b) => a.open_time - b.open_time);

    const candleData: CandlestickData[] = sorted.map((c) => ({
      time: c.open_time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData: HistogramData[] = sorted.map((c) => ({
      time: c.open_time as Time,
      value: c.volume,
      color: c.close >= c.open ? "rgba(34, 197, 94, 0.35)" : "rgba(240, 80, 110, 0.35)",
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
  }, [candles]);

  return (
    <GlassCard glowEdge="teal" className={cn("overflow-hidden flex flex-col space-y-0", className)}>
      {/* Chart Control Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border bg-white/[0.015] text-xs font-mono">
        <div className="flex items-center gap-3">
          {/* Interval Segmented Tabs */}
          <SegmentedTabs
            tabs={[
              { id: "5s", label: "5s" },
              { id: "1m", label: "1m" },
            ]}
            activeId={interval}
            onChange={(id) => onIntervalChange(id as "5s" | "1m")}
            size="sm"
            variant="brand"
          />

          {/* Simulated Haze Legend */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-text-dim">
            <span className="w-3 h-3 rounded-sm sim-hatch-pattern border border-sim-border" />
            <span>Simulated history</span>
            <span className="text-glass-border">|</span>
            <span className="text-brand-400 font-medium">Live from here &rarr;</span>
          </div>
        </div>

        {/* The Ward Legend Chip (Amber Dashed Glow) */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-warning/10 border border-warning/40 text-ward text-xs font-semibold shadow-glow-ward">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Resale Cap: {formatCurrency(ceilingPrice)}</span>
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div ref={containerRef} className="w-full h-[420px] relative" />
    </GlassCard>
  );
}
