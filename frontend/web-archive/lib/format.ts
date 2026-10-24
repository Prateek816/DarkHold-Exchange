/**
 * Unified Formatting Library for The Darkhold Exchange
 * Rule: Prices are integer minor units on the wire.
 * Quantities are integers. Always tabular numerals.
 */

export function formatCurrency(
  minorUnits: number | undefined | null,
  options?: { showSign?: boolean; showCents?: boolean }
): string {
  if (minorUnits === undefined || minorUnits === null || isNaN(minorUnits)) {
    return "—";
  }

  const isNegative = minorUnits < 0;
  const absUnits = Math.abs(minorUnits);
  const dollars = Math.floor(absUnits / 100);
  const cents = absUnits % 100;

  const dollarString = dollars.toLocaleString("en-US");
  const centsString = (options?.showCents ?? true) ? `.${cents.toString().padStart(2, "0")}` : "";

  let sign = "";
  if (isNegative) {
    sign = "-";
  } else if (options?.showSign && minorUnits > 0) {
    sign = "+";
  }

  return `${sign}$${dollarString}${centsString}`;
}

export function formatQuantity(qty: number | undefined | null): string {
  if (qty === undefined || qty === null || isNaN(qty)) {
    return "0";
  }
  return Math.floor(qty).toLocaleString("en-US");
}

export function formatPercent(value: number | undefined | null, showSign = true): string {
  if (value === undefined || value === null || isNaN(value)) {
    return "0.0%";
  }
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatDataAge(timestamp: number | undefined | null): { text: string; isStale: boolean } {
  if (!timestamp) return { text: "no recent activity", isStale: true };
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);

  if (diffSec < 5) return { text: "just now", isStale: false };
  if (diffSec < 60) return { text: `${diffSec}s ago`, isStale: diffSec >= 30 };
  
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return { text: `no trades for ${diffMin}m`, isStale: true };
  
  const diffHours = Math.floor(diffMin / 60);
  return { text: `no trades for ${diffHours}h`, isStale: true };
}

export function formatTimestamp(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatFullDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
