export function bucketStart(ts: number, intervalMs: number): number {
  return Math.floor(ts / intervalMs) * intervalMs;
}

export function bucketEnd(start: number, intervalMs: number): number {
  return start + intervalMs;
}
