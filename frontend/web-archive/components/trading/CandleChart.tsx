"use client";

import React, { useEffect, useMemo, useRef } from "react";
import type {
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  Time,
} from "lightweight-charts";
import { createChart, ColorType, LineStyle } from "lightweight-charts";
import type { Candle } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface CandleChartProps {
  candles: Candle[];
  ceilingPrice: number;
  lastTradePrice?: number;
  interval: "5s" | "1m";
  onIntervalChange: (interval: "5s" | "1m") => void;
  loading?: boolean;
  className?: string;
}

const UP = "#33E9A8";
const DOWN = "#FF6183";
const WARD = "#F2B04A";

export function CandleChart({
  candles,
  ceilingPrice,
  lastTradePrice,
  interval,
  onIntervalChange,
  loading = false,
  className,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const originCounts = useMemo(() => {
    return candles.reduce(
      (counts, candle) => {
        counts[candle.origin] += 1;
        return counts;
      },
      { SEEDED_SIM: 0, ENGINE: 0 }
    );
  }, [candles]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 440,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#ABA6C2",
        fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(160,140,255,0.028)" },
        horzLines: { color: "rgba(160,140,255,0.028)" },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.07)",
        timeVisible: true,
        secondsVisible: interval === "5s",
        rightOffset: 4,
        barSpacing: 8,
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.07)",
        autoScale: true,
        minimumWidth: 66,
        scaleMargins: { top: 0.08, bottom: 0.24 },
      },
      crosshair: {
        vertLine: { color: "rgba(255,255,255,0.28)", width: 1, style: LineStyle.Dashed },
        horzLine: { color: "rgba(255,255,255,0.28)", width: 1, style: LineStyle.Dashed },
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: UP,
      downColor: DOWN,
      borderVisible: false,
      wickUpColor: UP,
      wickDownColor: DOWN,
      priceFormat: {
        type: "custom",
        formatter: (value: number) => formatCurrency(value),
      },
    });
    candleSeriesRef.current = candleSeries;

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // THE WARD — the resale ceiling as a glowing ember-gold dashed line.
    candleSeries.createPriceLine({
      price: ceilingPrice,
      color: WARD,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "RESALE CAP",
    });

    const resize = () => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight || 440,
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

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    const sorted = [...candles].sort((a, b) => a.open_time - b.open_time);

    if (sorted.length === 0) {
      candleSeriesRef.current.setData([]);
      volumeSeriesRef.current.setData([]);
      candleSeriesRef.current.setMarkers([]);
      return;
    }

    const candleData: CandlestickData[] = sorted.map((candle) => ({
      time: candle.open_time as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    const volumeData: HistogramData[] = sorted.map((candle) => ({
      time: candle.open_time as Time,
      value: candle.volume,
        color:
          candle.close >= candle.open
            ? "rgba(51,233,168,0.34)"
            : "rgba(255,97,131,0.34)",
    }));

    const firstEngine = sorted.find((candle) => candle.origin === "ENGINE");

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
    candleSeriesRef.current.setMarkers(
      firstEngine
        ? [
            {
              time: firstEngine.open_time as Time,
              position: "belowBar",
              color: WARD,
              shape: "arrowUp",
              text: "live",
            },
          ]
        : []
    );
  }, [candles]);

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-card border border-glass-border bg-white/[0.02] shadow-card backdrop-blur-xl",
        className
      )}
      aria-label="Simulated candlestick chart"
    >
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-glass-border px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text">
            Price action
          </span>

          <SegmentedTabs
            tabs={[
              { id: "5s", label: "5s" },
              { id: "1m", label: "1m" },
            ]}
            activeId={interval}
            onChange={(id) => onIntervalChange(id as "5s" | "1m")}
            layoutId="terminal-interval"
            size="sm"
          />

          <span
            className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.08em] text-text-dim"
            title="Seeded candles are illustrative. Engine candles are aggregated only from actual mock trade prints."
          >
            <span className="h-2.5 w-2.5 border border-sim-border sim-hatch" />
            Simulated history {originCounts.SEEDED_SIM}
            <span className="px-1 text-text-dim">·</span>
            <span className="h-2 w-2 bg-brand-400" />
            Live {originCounts.ENGINE}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {lastTradePrice !== undefined && (
            <span className="hidden items-center gap-2 rounded-pill border border-glass-border bg-white/[0.03] px-3 py-1.5 font-mono text-[9.5px] text-text-muted md:inline-flex">
              Last
              <span className="tabular-nums text-text">{formatCurrency(lastTradePrice)}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-ward/40 bg-ward-tint px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-ward">
            <ShieldAlert className="h-3 w-3" />
            Resale cap {formatCurrency(ceilingPrice)}
          </span>
        </div>
      </div>

      {/* Chart body */}
      <div className="relative">
        <div
          ref={containerRef}
          className="h-[340px] w-full sm:h-[440px]"
          aria-hidden="true"
        />
        {loading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-canvas/40 font-mono text-[10px] uppercase tracking-[0.1em] text-text-muted">
            Loading {interval} candles…
          </div>
        )}
        {!loading && candles.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-canvas/50 px-6 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-muted">
              No candle data
            </p>
            <p className="max-w-xs font-mono text-[9px] leading-relaxed text-text-dim">
              Candles appear only when the mock service has prints for this interval. No
              trades means no candle.
            </p>
          </div>
        )}
      </div>

      <p className="border-t border-glass-border px-5 py-2.5 font-mono text-[9px] leading-relaxed tracking-[0.03em] text-text-dim">
        Seeded history is illustrative and marked SEEDED_SIM. Candles switch to live only
        where a mock print exists; the marker is the first live candle. The ember line is
        the Ward — orders above it are rejected.
      </p>
    </section>
  );
}
